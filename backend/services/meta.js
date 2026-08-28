const fetch = require('node-fetch');
const prisma = require('../db');
const { decrypt } = require('./crypto');

async function getConfig(tenantId) {
  return prisma.whatsAppConfiguration.findUnique({ where: { tenantId } });
}
function cleanPhone(to) { return String(to || '').replace(/\D/g, ''); }

async function graphRequest(tenantId, path, body, method='POST') {
  const config = await getConfig(tenantId);
  const mode = config?.mode || process.env.WHATSAPP_MODE || 'mock';
  if (mode === 'mock') return { ok: true, mock: true, data: { messages: [{ id: `wamid.mock.${Date.now()}.${Math.random().toString(36).slice(2)}` }] } };
  if (!config?.accessToken || !config?.phoneNumberId) return { ok: false, error: { message: 'WhatsApp is not configured. Add Meta credentials in Settings.' } };
  const version = process.env.META_GRAPH_API_VERSION || 'v20.0';
  const url = `https://graph.facebook.com/${version}/${path}`;
  try {
    const resp = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${decrypt(config.accessToken)}`, 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok) return { ok: false, error: data?.error || { message: 'Meta API rejected the request.' }, httpStatus: resp.status };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: { message: `WhatsApp API unavailable: ${e.message}` } };
  }
}

async function sendTextMessage({ tenantId, to, body }) {
  const result = await graphRequest(tenantId, `${(await getConfig(tenantId))?.phoneNumberId || ''}/messages`, {
    messaging_product: 'whatsapp', to: cleanPhone(to), type: 'text', text: { body },
  });
  return { ok: result.ok, metaMessageId: result.data?.messages?.[0]?.id || null, error: result.error?.message || null, errorCode: result.error?.code || null };
}

async function sendTemplate({ tenantId, to, name, language='en_US', parameters=[] }) {
  const config = await getConfig(tenantId);
  const result = await graphRequest(tenantId, `${config?.phoneNumberId || ''}/messages`, {
    messaging_product: 'whatsapp', to: cleanPhone(to), type: 'template',
    template: { name, language: { code: language }, components: parameters.length ? [{ type: 'body', parameters: parameters.map(text => ({ type: 'text', text: String(text) })) }] : undefined },
  });
  return { ok: result.ok, metaMessageId: result.data?.messages?.[0]?.id || null, error: result.error?.message || null, errorCode: result.error?.code || null };
}

async function sendInteractive({ tenantId, to, interactive }) {
  const config = await getConfig(tenantId);
  const result = await graphRequest(tenantId, `${config?.phoneNumberId || ''}/messages`, {
    messaging_product: 'whatsapp', to: cleanPhone(to), type: 'interactive', interactive,
  });
  return { ok: result.ok, metaMessageId: result.data?.messages?.[0]?.id || null, error: result.error?.message || null, errorCode: result.error?.code || null };
}

async function sendMedia({ tenantId, to, type, media }) {
  const config = await getConfig(tenantId);
  const result = await graphRequest(tenantId, `${config?.phoneNumberId || ''}/messages`, {
    messaging_product: 'whatsapp', to: cleanPhone(to), type, [type]: media,
  });
  return { ok: result.ok, metaMessageId: result.data?.messages?.[0]?.id || null, error: result.error?.message || null, errorCode: result.error?.code || null };
}

async function markRead({ tenantId, messageId }) {
  const config = await getConfig(tenantId);
  return graphRequest(tenantId, `${config?.phoneNumberId || ''}/messages`, {
    messaging_product: 'whatsapp', status: 'read', message_id: messageId,
  });
}

async function syncTemplates(tenantId) {
  const config = await getConfig(tenantId);
  if (!config?.businessAccountId || (config.mode || 'mock') === 'mock') return { ok: true, mock: true, templates: [] };
  const result = await graphRequest(tenantId, `${config.businessAccountId}/message_templates?limit=100`, null, 'GET');
  if (!result.ok) return { ok: false, error: result.error?.message || 'Template sync failed.' };
  return { ok: true, templates: result.data?.data || [] };
}

module.exports = { getConfig, sendTextMessage, sendTemplate, sendInteractive, sendMedia, markRead, syncTemplates };
