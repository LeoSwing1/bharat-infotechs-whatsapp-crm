import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import { Modal, EmptyState, Loading, Badge } from '../components/ui';
import { useToast } from '../context/ToastContext';

const emptyForm = { name: '', category: 'MARKETING', language: 'en_US', status: 'PENDING', body: '' };

export default function Templates() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/templates').then((res) => setTemplates(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(emptyForm); setEditingId(null); setShowForm(true); }
  function openEdit(t) {
    setForm({ name: t.name, category: t.category, language: t.language, status: t.status, body: t.body });
    setEditingId(t.id);
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) { await api.put(`/templates/${editingId}`, form); toast.push('Template updated', 'success'); }
      else { await api.post('/templates', form); toast.push('Template created', 'success'); }
      setShowForm(false);
      load();
    } catch (err) { toast.push(errorMessage(err), 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this template?')) return;
    try { await api.delete(`/templates/${id}`); toast.push('Template deleted', 'success'); load(); }
    catch (err) { toast.push(errorMessage(err), 'error'); }
  }

  const detectedVars = [...(form.body || '').matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]);

  return (
    <>
      <PageHeader title="WhatsApp Templates" actions={<button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> New Template</button>} />
      <div className="page-body">
        <div className="card">
          <div className="card-pad text-sm muted" style={{ borderBottom: '1px solid var(--color-border)' }}>
            Templates requiring Meta approval should be synchronized from your WhatsApp Business Manager once connected in Settings.
            Templates created here as "PENDING" represent drafts awaiting Meta approval.
          </div>
          {loading ? <Loading /> : templates.length === 0 ? (
            <EmptyState title="No templates yet" subtitle="Create your first message template." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Category</th><th>Language</th><th>Status</th><th>Variables</th><th>Updated</th><th></th></tr></thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td>{t.category}</td>
                      <td>{t.language}</td>
                      <td><Badge status={t.status} /></td>
                      <td className="text-sm muted">{t.variables.join(', ') || '—'}</td>
                      <td className="text-sm muted">{new Date(t.updated_at).toLocaleDateString()}</td>
                      <td>
                        <div className="flex-gap">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}><Pencil size={13} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <Modal
          title={editingId ? 'Edit Template' : 'New Template'}
          onClose={() => setShowForm(false)}
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </>
          )}
        >
          <form onSubmit={handleSave}>
            <div className="field"><label>Template Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="event_invitation" /></div>
            <div className="field-row">
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
              <div className="field">
                <label>Language</label>
                <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="PENDING">Pending Meta approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="field">
              <label>Message Body * (use {'{{name}}'}, {'{{event_name}}'}, {'{{date}}'}, {'{{venue}}'}, {'{{link}}'}, {'{{company}}'})</label>
              <textarea rows={6} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            {detectedVars.length > 0 && (
              <p className="text-sm muted">Detected variables: {detectedVars.join(', ')}</p>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
