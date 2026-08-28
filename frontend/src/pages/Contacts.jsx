import { useEffect, useState, useCallback } from 'react';
import { Upload, Plus, Search, Trash2, Pencil, Download } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import { Modal, EmptyState, Loading } from '../components/ui';
import { useToast } from '../context/ToastContext';
import ImportWizard from '../components/ImportWizard';

const emptyForm = { name: '', phone: '', email: '', company: '', designation: '', event_id: '', venue: '', link: '' };

export default function Contacts() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(() => {
    setLoading(true);
    api.get('/contacts', { params: { search } }).then((res) => {
      setRows(res.data.rows);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { api.get('/events').then((res) => setEvents(res.data)); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(contact) {
    setForm({
      name: contact.name || '', phone: contact.phone || '', email: contact.email || '',
      company: contact.company || '', designation: contact.designation || '',
      event_id: contact.event_id || '', venue: contact.venue || '', link: contact.link || '',
    });
    setEditingId(contact.id);
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/contacts/${editingId}`, form);
        toast.push('Contact updated', 'success');
      } else {
        await api.post('/contacts', form);
        toast.push('Contact added', 'success');
      }
      setShowForm(false);
      loadContacts();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      toast.push('Contact deleted', 'success');
      loadContacts();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    }
  }

  async function handleBulkDelete() {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} selected contacts?`)) return;
    try {
      await api.post('/contacts/bulk-delete', { ids: selected });
      toast.push('Contacts deleted', 'success');
      setSelected([]);
      loadContacts();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    }
  }

  function toggleSelect(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleSelectAll() {
    setSelected(selected.length === rows.length ? [] : rows.map((r) => r.id));
  }

  const eventName = (id) => events.find((e) => e.id === id)?.name || '—';

  return (
    <>
      <PageHeader
        title="Contacts"
        actions={(
          <>
            <a className="btn btn-secondary" href="/api/contacts/export/csv" target="_blank" rel="noreferrer">
              <Download size={14} /> Export
            </a>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}><Upload size={14} /> Import Excel/CSV</button>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Contact</button>
          </>
        )}
      />
      <div className="page-body">
        <div className="card">
          <div className="card-pad flex-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ position: 'relative', maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-text-muted)' }} />
              <input
                placeholder="Search name, phone, email, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 32, width: 300 }}
              />
            </div>
            {selected.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={13} /> Delete {selected.length} selected
              </button>
            )}
          </div>
          {loading ? <Loading /> : rows.length === 0 ? (
            <EmptyState title="No contacts yet" subtitle="Add a contact manually or import a list from Excel/CSV." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={selected.length === rows.length && rows.length > 0} onChange={toggleSelectAll} /></th>
                    <th>Name</th><th>Phone</th><th>Email</th><th>Company</th><th>Designation</th><th>Event</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                      <td>{c.name}</td>
                      <td>{c.phone}</td>
                      <td>{c.email || '—'}</td>
                      <td>{c.company || '—'}</td>
                      <td>{c.designation || '—'}</td>
                      <td>{c.event_id ? eventName(c.event_id) : '—'}</td>
                      <td>
                        <div className="flex-gap">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="card-pad text-sm muted">{total} total contacts</div>
        </div>
      </div>

      {showForm && (
        <Modal
          title={editingId ? 'Edit Contact' : 'Add Contact'}
          onClose={() => setShowForm(false)}
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </>
          )}
        >
          <form onSubmit={handleSave}>
            <div className="field-row">
              <div className="field"><label>Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Phone *</label><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91XXXXXXXXXX" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Company</label><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Designation</label><input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
              <div className="field">
                <label>Event</label>
                <select value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}>
                  <option value="">None</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Venue</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
              <div className="field"><label>Registration Link</label><input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></div>
            </div>
          </form>
        </Modal>
      )}

      {showImport && (
        <ImportWizard
          events={events}
          onClose={() => setShowImport(false)}
          onComplete={() => { setShowImport(false); loadContacts(); }}
        />
      )}
    </>
  );
}
