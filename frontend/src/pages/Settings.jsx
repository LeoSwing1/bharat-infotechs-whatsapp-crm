import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import { Badge, Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    api.get('/whatsapp/config').then((res) => {
      setConfig(res.data);
      setForm(res.data);
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/whatsapp/config', form);
      setConfig(data);
      setForm(data);
      toast.push('WhatsApp settings saved', 'success');
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncTemplates() {
    setSyncing(true);
    try {
      const { data } = await api.post('/whatsapp/sync-templates');
      toast.push(`Template sync complete (${data.count ?? data.templates?.length ?? 0})`, 'success');
    } catch (err) { toast.push(errorMessage(err, 'Template sync failed.'), 'error'); }
    finally { setSyncing(false); }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post('/whatsapp/test-connection');
      setTestResult({ ok: true, message: data.message });
    } catch (err) {
      setTestResult({ ok: false, message: errorMessage(err, 'Connection test failed.') });
    } finally {
      setTesting(false);
    }
  }

  if (!form) return <><PageHeader title="WhatsApp Settings" /><div className="page-body"><Loading /></div></>;

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <PageHeader title="WhatsApp Settings" />
      <div className="page-body">
        <div className="card card-pad" style={{ maxWidth: 640 }}>
          <div className="flex-between mb-16">
            <h3 style={{ margin: 0 }}>WhatsApp Business</h3>
            <Badge status={config.connection_status} />
          </div>

          <div className="field">
            <label>Send Mode</label>
            <select
              value={form.mode}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
            >
              <option value="mock">Sandbox (Mock) — simulate sends, no real messages</option>
              <option value="live">Live — send real WhatsApp messages via Meta Cloud API</option>
            </select>
            <p className="text-sm muted" style={{ marginTop: 6 }}>
              In sandbox mode the CRM simulates delivery, read receipts and occasional replies so you can test the full workflow safely.
            </p>
          </div>

          <div className="field">
            <label>Business Account ID</label>
            <input disabled={!isAdmin} value={form.business_account_id || ''} onChange={(e) => setForm({ ...form, business_account_id: e.target.value })} />
          </div>
          <div className="field">
            <label>Phone Number ID</label>
            <input disabled={!isAdmin} value={form.phone_number_id || ''} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} />
          </div>
          <div className="field">
            <label>Display Phone Number</label>
            <input disabled={!isAdmin} value={form.display_phone_number || ''} onChange={(e) => setForm({ ...form, display_phone_number: e.target.value })} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div className="field">
            <label>Access Token {form.has_access_token && <span className="text-sm muted">(currently set — leave blank to keep)</span>}</label>
            <input disabled={!isAdmin} type="password" placeholder={form.has_access_token ? '••••••••••••' : 'Paste Meta System User access token'} onChange={(e) => setForm({ ...form, access_token: e.target.value })} />
          </div>
          <div className="field">
            <label>Webhook Verify Token</label>
            <input disabled={!isAdmin} value={form.webhook_verify_token || ''} onChange={(e) => setForm({ ...form, webhook_verify_token: e.target.value })} />
            <p className="text-sm muted" style={{ marginTop: 6 }}>
              Configure this URL in your Meta App's webhook settings: <code>{window.location.origin}/api/whatsapp/webhook</code>
            </p>
          </div>

          <div className="flex-gap" style={{ marginTop: 8 }}>
            {isAdmin && <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>}
            <button className="btn btn-secondary" onClick={handleTest} disabled={testing}>{testing ? 'Testing...' : 'Test Connection'}</button>
            {isAdmin && <button className="btn btn-secondary" onClick={handleSyncTemplates} disabled={syncing}>{syncing ? 'Syncing...' : 'Sync Meta Templates'}</button>}
          </div>

          {testResult && (
            <div className="flex-gap text-sm" style={{ marginTop: 12, color: testResult.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {testResult.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />} {testResult.message}
            </div>
          )}

          {!isAdmin && (
            <p className="text-sm muted" style={{ marginTop: 14 }}>Only admin users can edit WhatsApp configuration.</p>
          )}
        </div>

        <div className="card card-pad" style={{ maxWidth: 640, marginTop: 16 }}>
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Billing Note</h3>
          <p className="text-sm muted" style={{ margin: 0 }}>
            Bharat Infotechs provides the CRM software and technical integration only. Your Meta Business Account, WhatsApp Business
            Account, and phone number remain fully owned by you. Meta determines applicable messaging rates, categories, limits and
            eligibility, and you are responsible for those charges directly with Meta.
          </p>
        </div>
      </div>
    </>
  );
}
