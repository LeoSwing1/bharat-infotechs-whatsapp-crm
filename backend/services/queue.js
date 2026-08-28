const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

const queueName = "whatsapp-dispatch";
const prefix = (process.env.BULLMQ_PREFIX || "bharat-crm").replace(/:/g, "-");

const whatsappQueue = new Queue(queueName, {
  connection,
  prefix,
  defaultJobOptions: {
    attempts: Number(process.env.WORKER_MAX_ATTEMPTS || 5),
    backoff: { type: "exponential", delay: Number(process.env.WORKER_BACKOFF_MS || 2000) },
    removeOnComplete: { age: 86400, count: 10000 },
    removeOnFail: { age: 604800, count: 50000 },
  },
});

async function enqueueMessage(messageId, delay = 0) {
  return whatsappQueue.add("send-message", { messageId: Number(messageId) }, {
    jobId: `message-${messageId}`,
    delay,
  });
}

async function enqueueCampaign(messageIds, delay = 0) {
  return Promise.all(messageIds.map((id) => enqueueMessage(id, delay)));
}

module.exports = { whatsappQueue, enqueueMessage, enqueueCampaign, connection, queueName };
