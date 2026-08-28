import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Users, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import { Modal, EmptyState, Loading, Badge } from '../components/ui';
import { useToast } from '../context/ToastContext';

const emptyForm = {
  name: '', event_date: '', event_time: '', venue: '', address: '', description: '', registration_url: '', status: 'upcoming',
};

export default function Events() {
  const toast = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/events').then((res) => setEvents(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(ev) {
    setForm({
      name: ev.name || '', event_date: ev.event_date || '', event_time: ev.event_time || '',
      venue: ev.venue || '', address: ev.address || '', description: ev.description || '',
      registration_url: ev.registration_url || '', status: ev.status || 'upcoming',
    });
    setEditingId(ev.id);
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/events/${editingId}`, form);
        toast.push('Event updated', 'success');
      } else {
        await api.post('/events', form);
        toast.push('Event created', 'success');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this event? Linked contacts will be kept but unlinked.')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.push('Event deleted', 'success');
      load();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Events"
        actions={<button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Create Event</button>}
      />
      <div className="page-body">
        {loading ? <Loading /> : events.length === 0 ? (
          <EmptyState title="No events yet" subtitle="Create an event to organize recipients and campaigns around it." />
        ) : (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {events.map((ev) => (
              <div key={ev.id} className="card card-pad">
                <div className="flex-between mb-16">
                  <Badge status={ev.status} />
                  <div className="flex-gap">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ev)}><Pencil size={13} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(ev.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: 15.5 }}>{ev.name}</h3>
                <p className="text-sm muted" style={{ margin: '0 0 4px' }}>
                  {ev.event_date || 'No date set'}{ev.event_time ? ` · ${ev.event_time}` : ''}
                </p>
                <p className="text-sm muted" style={{ margin: '0 0 14px' }}>{ev.venue || 'No venue set'}</p>
                <div className="flex-between text-sm">
                  <span className="flex-gap muted"><Users size={13} /> {ev.contactCount} contacts</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/contacts?event=${ev.id}`)}>
                    View Contacts
                  </button>
                </div>
                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => navigate(`/campaigns/new?event=${ev.id}`)}>
                  <Send size={13} /> New Campaign for this Event
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Modal
          title={editingId ? 'Edit Event' : 'Create Event'}
          onClose={() => setShowForm(false)}
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </>
          )}
        >
          <form onSubmit={handleSave}>
            <div className="field"><label>Event Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field-row">
              <div className="field"><label>Event Date</label><input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
              <div className="field"><label>Event Time</label><input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Venue</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="field"><label>Registration URL</label><input value={form.registration_url} onChange={(e) => setForm({ ...form, registration_url: e.target.value })} /></div>
            <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </form>
        </Modal>
      )}
    </>
  );
}
