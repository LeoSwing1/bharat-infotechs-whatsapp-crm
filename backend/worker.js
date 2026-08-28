require("dotenv").config();
const { Worker } = require("bullmq");
const prisma = require("./db");
const { connection, queueName } = require("./services/queue");
const meta = require("./services/meta");
const { broadcast } = require("./services/realtime");

const concurrency = Math.max(1, Number(process.env.WORKER_CONCURRENCY || 20));
const mps = Math.max(1, Number(process.env.META_MESSAGES_PER_SECOND || 50));
const interval = 1000 / mps;
let nextSlot = Date.now();

async function throttle() {
  const now = Date.now();
  nextSlot = Math.max(now, nextSlot) + interval;
  const wait = nextSlot - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

async function logStatus(tenantId, messageId, status, rawPayload) {
  await prisma.messageStatusLog.create({ data: { tenantId, messageId, status, rawPayload: rawPayload || undefined } });
}

async function finishCampaignIfDone(tenantId, campaignId) {
  if (!campaignId) return;
  const pending = await prisma.message.count({ where: { tenantId, campaignId, status: { in: ["queued", "processing", "draft_hold"] } } });
  if (pending === 0) {
    const failed = await prisma.message.count({ where: { tenantId, campaignId, status: "failed" } });
    await prisma.campaign.updateMany({ where: { id: campaignId, tenantId, status: { notIn: ["cancelled", "paused"] } }, data: { status: failed ? "failed" : "completed" } });
  }
}

async function processMessage(job) {
  const messageId = Number(job.data.messageId);
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || ["failed", "read", "delivered", "sent"].includes(msg.status)) return;
  const campaign = msg.campaignId ? await prisma.campaign.findFirst({ where: { id: msg.campaignId, tenantId: msg.tenantId } }) : null;
  if (campaign?.status === "paused" || campaign?.status === "cancelled") return;

  await throttle();
  await prisma.message.update({ where: { id: msg.id }, data: { status: "processing" } });
  if (campaign) await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "processing" } });

  const result = await meta.sendTextMessage({ tenantId: msg.tenantId, to: msg.phone, body: msg.content || "" });
  if (!result.ok) {
    const retryable = [130429, 131048, 131026, 131047].includes(Number(result.errorCode)) || /rate|timeout|unavailable|temporar/i.test(result.error || "");
    const attempts = msg.retryCount + 1;
    if (retryable && attempts < Number(process.env.WORKER_MAX_ATTEMPTS || 5)) {
      await prisma.message.update({ where: { id: msg.id }, data: { status: "queued", retryCount: attempts, error: result.error, metaErrorCode: result.errorCode ? String(result.errorCode) : null } });
      throw new Error(`RETRYABLE_META_ERROR ${result.errorCode || ""} ${result.error || ""}`);
    }
    await prisma.message.update({ where: { id: msg.id }, data: { status: "failed", retryCount: attempts, error: result.error, metaErrorCode: result.errorCode ? String(result.errorCode) : null, failedAt: new Date() } });
    await logStatus(msg.tenantId, msg.id, "failed", { error: result.error, code: result.errorCode });
    broadcast(msg.tenantId, "message.status", { messageId: msg.id, status: "failed", error: result.error, code: result.errorCode });
    await finishCampaignIfDone(msg.tenantId, msg.campaignId);
    return;
  }

  const sentAt = new Date();
  await prisma.message.update({ where: { id: msg.id }, data: { status: "sent", metaMessageId: result.metaMessageId, sentAt } });
  await logStatus(msg.tenantId, msg.id, "sent", { metaMessageId: result.metaMessageId, mock: !!result.mock });
  broadcast(msg.tenantId, "message.status", { messageId: msg.id, status: "sent", metaMessageId: result.metaMessageId });

  // Safe local lifecycle simulation only in mock mode. Live mode is driven by Meta webhooks.
  if (result.mock) {
    setTimeout(async () => {
      try {
        await prisma.message.update({ where: { id: msg.id }, data: { status: "delivered", deliveredAt: new Date() } });
        await logStatus(msg.tenantId, msg.id, "delivered", { mock: true });
        broadcast(msg.tenantId, "message.status", { messageId: msg.id, status: "delivered" });
        setTimeout(async () => {
          try {
            await prisma.message.update({ where: { id: msg.id }, data: { status: "read", readAt: new Date() } });
            await logStatus(msg.tenantId, msg.id, "read", { mock: true });
            broadcast(msg.tenantId, "message.status", { messageId: msg.id, status: "read" });
            await finishCampaignIfDone(msg.tenantId, msg.campaignId);
          } catch (e) { console.error("Mock read simulation failed", e.message); }
        }, 1800);
      } catch (e) { console.error("Mock delivery simulation failed", e.message); }
    }, 1200);
  }

  await finishCampaignIfDone(msg.tenantId, msg.campaignId);
}

async function processScheduledJobs() {
  const jobs = await prisma.scheduledJob.findMany({ where: { status: "pending", runAt: { lte: new Date() } }, take: 25 });
  for (const job of jobs) {
    try {
      const campaign = await prisma.campaign.findFirst({ where: { id: job.campaignId, tenantId: job.tenantId } });
      if (!campaign || campaign.status === "cancelled") {
        await prisma.scheduledJob.update({ where: { id: job.id }, data: { status: "cancelled" } });
        continue;
      }
      const messages = await prisma.message.findMany({ where: { tenantId: job.tenantId, campaignId: job.campaignId, status: "draft_hold" }, select: { id: true } });
      await prisma.$transaction([
        prisma.scheduledJob.update({ where: { id: job.id }, data: { status: "running" } }),
        prisma.campaign.update({ where: { id: campaign.id }, data: { status: "queued" } }),
        prisma.message.updateMany({ where: { tenantId: job.tenantId, campaignId: job.campaignId, status: "draft_hold" }, data: { status: "queued" } }),
      ]);
      await Promise.all(messages.map((m) => require("./services/queue").whatsappQueue.add("send-message", { messageId: m.id }, { jobId: `message-${m.id}` })));
      await prisma.scheduledJob.update({ where: { id: job.id }, data: { status: "completed" } });
    } catch (e) {
      console.error("Scheduled job failed", job.id, e.message);
      await prisma.scheduledJob.update({ where: { id: job.id }, data: { status: "failed" } }).catch(() => {});
    }
  }
}

const worker = new Worker(queueName, processMessage, { connection, concurrency, limiter: { max: mps, duration: 1000 } });
worker.on("completed", (job) => console.log(`✓ WhatsApp job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`✗ WhatsApp job ${job?.id} failed:`, err.message));
console.log(`WhatsApp worker running: queue=${queueName} concurrency=${concurrency} target=${mps} msg/s`);

const timer = setInterval(() => processScheduledJobs().catch((e) => console.error("Scheduler loop error", e.message)), 5000);
processScheduledJobs().catch((e) => console.error("Initial scheduler error", e.message));

async function shutdown() { clearInterval(timer); await worker.close(); await connection.quit(); await prisma.$disconnect(); process.exit(0); }
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
