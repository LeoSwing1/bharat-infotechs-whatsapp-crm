import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';

const STEPS = ['Details', 'Recipients', 'Template', 'Preview', 'Schedule/Send'];

export default function CampaignBuilder() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: routeCampaignId } = useParams();
  const presetEventId = searchParams.get('event') || '';

  const [step, setStep] = useState(0);
  const [events, setEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [campaignId, setCampaignId] = useState(null);
  const [name, setName] = useState('');
  const [eventId, setEventId] = useState(presetEventId);
  const [templateId, setTemplateId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [useEventContacts, setUseEventContacts] = useState(true);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [preview, setPreview] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    api.get('/events').then((res) => setEvents(res.data));
    api.get('/templates').then((res) => setTemplates(res.data));
    api.get('/contacts', { params: { pageSize: 500 } }).then((res) => setContacts(res.data.rows));
    if (routeCampaignId) {
      api.get(`/campaigns/${routeCampaignId}`).then(({ data }) => {
        setCampaignId(data.id); setName(data.name || ''); setEventId(data.event_id ? String(data.event_id) : '');
        setTemplateId(data.template_id ? String(data.template_id) : ''); setCustomMessage(data.message_content || '');
        if (data.stats?.recipients) setUseEventContacts(false);
      });
    }
  }, [routeCampaignId]);

  const selectedTemplate = useMemo(() => templates.find((t) => String(t.id) === String(templateId)), [templates, templateId]);
  const eventContacts = useMemo(() => contacts.filter((c) => String(c.event_id) === String(eventId)), [contacts, eventId]);

  async function ensureCampaign() {
    if (campaignId) {
      await api.put(`/campaigns/${campaignId}`, {
        name, event_id: eventId || null, template_id: templateId || null, message_content: customMessage || null,
      });
      return campaignId;
    }
    const { data } = await api.post('/campaigns', {
      name, event_id: eventId || null, template_id: templateId || null, message_content: customMessage || null,
    });
    setCampaignId(data.id);
    return data.id;
  }

  async function handleNextFromDetails() {
    if (!name.trim()) return toast.push('Campaign name is required.', 'error');
    setBusy(true);
    try {
      await ensureCampaign();
      setStep(1);
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleNextFromRecipients() {
    const hasRecipients = useEventContacts ? eventContacts.length > 0 : selectedContactIds.length > 0;
    if (!hasRecipients) return toast.push('Select at least one recipient.', 'error');
    setBusy(true);
    try {
      const id = await ensureCampaign();
      await api.post(`/campaigns/${id}/recipients`, useEventContacts
        ? { use_event_contacts: true }
        : { contact_ids: selectedContactIds });
      setStep(2);
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleNextFromTemplate() {
    if (!templateId && !customMessage.trim()) return toast.push('Select a template or enter a custom message.', 'error');
    setBusy(true);
    try {
      await ensureCampaign();
      const { data } = await api.get(`/campaigns/${campaignId}/preview`);
      setPreview(data);
      setStep(3);
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    setBusy(true);
    try {
      const payload = {};
      if (scheduleMode === 'later') {
        if (!scheduledAt) { toast.push('Choose a date and time to schedule.', 'error'); setBusy(false); return; }
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      }
      const { data } = await api.post(`/campaigns/${campaignId}/send`, payload);
      setSendResult(data);
      setStep(4);
      toast.push(data.status === 'scheduled' ? 'Campaign scheduled' : 'Campaign sent to queue', 'success');
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  function toggleContact(id) {
    setSelectedContactIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <>
      <PageHeader title="Create Campaign" />
      <div className="page-body">
        <div className="stepper">
          {STEPS.map((label, i) => (
            <div key={label} className={`step-pill ${step === i ? 'active' : step > i ? 'done' : ''}`}>{i + 1}. {label}</div>
          ))}
        </div>

        <div className="card card-pad" style={{ maxWidth: 780 }}>

          {step === 0 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Campaign Details</h3>
              <div className="field">
                <label>Campaign Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Annual Summit Invitation" />
              </div>
              <div className="field">
                <label>Event</label>
                <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  <option value="">No event (general campaign)</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div className="flex-between" style={{ marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => navigate('/campaigns')}>Cancel</button>
                <button className="btn btn-primary" onClick={handleNextFromDetails} disabled={busy}>Next: Recipients</button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Select Recipients</h3>
              <div className="field">
                <label>
                  <input type="radio" checked={useEventContacts} onChange={() => setUseEventContacts(true)} disabled={!eventId} />
                  {' '}Use all contacts from the selected event {eventId ? `(${eventContacts.length} contacts)` : '(select an event first)'}
                </label>
              </div>
              <div className="field">
                <label>
                  <input type="radio" checked={!useEventContacts} onChange={() => setUseEventContacts(false)} />
                  {' '}Choose specific contacts ({selectedContactIds.length} selected)
                </label>
              </div>
              {!useEventContacts && (
                <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                  <table className="data-table">
                    <thead><tr><th></th><th>Name</th><th>Phone</th><th>Company</th></tr></thead>
                    <tbody>
                      {contacts.map((c) => (
                        <tr key={c.id}>
                          <td><input type="checkbox" checked={selectedContactIds.includes(c.id)} onChange={() => toggleContact(c.id)} /></td>
                          <td>{c.name}</td><td>{c.phone}</td><td>{c.company || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex-between" style={{ marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setStep(0)}>Back</button>
                <button className="btn btn-primary" onClick={handleNextFromRecipients} disabled={busy}>Next: Template</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Select Template & Personalize</h3>
              <div className="field">
                <label>WhatsApp Template</label>
                <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setCustomMessage(''); }}>
                  <option value="">Write a custom message instead</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.status}, {t.category})</option>
                  ))}
                </select>
              </div>
              {selectedTemplate && (
                <div className="card card-pad" style={{ background: '#fafcfc', marginBottom: 14 }}>
                  <p className="text-sm muted" style={{ marginTop: 0 }}>Template preview (variables fill in per recipient):</p>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: 13.5 }}>{selectedTemplate.body}</pre>
                </div>
              )}
              {!templateId && (
                <div className="field">
                  <label>Custom Message (use {'{{name}}'}, {'{{event_name}}'}, {'{{date}}'}, {'{{venue}}'}, {'{{link}}'}, {'{{company}}'})</label>
                  <textarea rows={6} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Hello {{name}}, ..." />
                </div>
              )}
              <div className="flex-between" style={{ marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" onClick={handleNextFromTemplate} disabled={busy}>Next: Preview</button>
              </div>
            </div>
          )}

          {step === 3 && preview && (
            <div>
              <h3 style={{ marginTop: 0 }}>Preview</h3>
              <p className="text-sm muted">Personalized message for {preview.totalRecipients} recipients. Showing a sample:</p>
              <div style={{ display: 'grid', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
                {preview.sample.map((p) => (
                  <div key={p.contact_id} className="wa-preview">
                    <p className="text-sm" style={{ margin: '0 0 6px', fontWeight: 600 }}>{p.name} · {p.phone}</p>
                    <div className="wa-bubble">{p.personalized_message}</div>
                  </div>
                ))}
              </div>
              <div className="flex-between" style={{ marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>Next: Schedule / Send</button>
              </div>
            </div>
          )}

          {step === 4 && !sendResult && (
            <div>
              <h3 style={{ marginTop: 0 }}>Schedule or Send</h3>
              <div className="field">
                <label><input type="radio" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} /> Send immediately</label>
              </div>
              <div className="field">
                <label><input type="radio" checked={scheduleMode === 'later'} onChange={() => setScheduleMode('later')} /> Schedule for later</label>
              </div>
              {scheduleMode === 'later' && (
                <div className="field">
                  <label>Date & Time</label>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </div>
              )}
              <p className="text-sm muted">
                Messages will be processed through a controlled queue (approx. 20 at a time) rather than sent all at once,
                to stay within safe throughput and Meta's messaging limits.
              </p>
              <div className="flex-between" style={{ marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
                <button className="btn btn-primary" onClick={handleSend} disabled={busy}>
                  {busy ? 'Submitting...' : scheduleMode === 'later' ? 'Schedule Campaign' : 'Send Campaign'}
                </button>
              </div>
            </div>
          )}

          {sendResult && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <h3 style={{ color: 'var(--color-success)' }}>
                {sendResult.status === 'scheduled' ? 'Campaign Scheduled' : 'Campaign Queued'}
              </h3>
              <p className="muted">
                {sendResult.recipientCount} recipients {sendResult.status === 'scheduled'
                  ? `will be messaged at ${new Date(sendResult.scheduled_at).toLocaleString()}.`
                  : 'have been placed in the message queue and will be sent shortly.'}
              </p>
              <div className="flex-gap" style={{ justifyContent: 'center', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => navigate('/campaigns')}>View All Campaigns</button>
                <button className="btn btn-primary" onClick={() => navigate(`/reports/${campaignId}`)}>View Report</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
