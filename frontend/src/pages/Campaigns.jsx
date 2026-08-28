import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pause, Play, XCircle, Trash2, BarChart3 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import { Badge, EmptyState, Loading } from '../components/ui';
import { useToast } from '../context/ToastContext';

export default function Campaigns() {
  const toast = useToast();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/campaigns').then((res) => setCampaigns(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000); // live-ish refresh while messages process
    return () => clearInterval(interval);
  }, [load]);

  async function handlePause(id) {
    try { await api.post(`/campaigns/${id}/pause`); toast.push('Campaign paused', 'success'); load(); }
    catch (err) { toast.push(errorMessage(err), 'error'); }
  }
  async function handleResume(id) {
    try { await api.post(`/campaigns/${id}/resume`); toast.push('Campaign resumed', 'success'); load(); }
    catch (err) { toast.push(errorMessage(err), 'error'); }
  }
  async function handleCancel(id) {
    if (!window.confirm('Cancel this campaign? Pending messages will not be sent.')) return;
    try { await api.post(`/campaigns/${id}/cancel`); toast.push('Campaign cancelled', 'success'); load(); }
    catch (err) { toast.push(errorMessage(err), 'error'); }
  }
  async function handleDelete(id) {
    if (!window.confirm('Delete this draft campaign?')) return;
    try { await api.delete(`/campaigns/${id}`); toast.push('Campaign deleted', 'success'); load(); }
    catch (err) { toast.push(errorMessage(err), 'error'); }
  }

  return (
    <>
      <PageHeader
        title="Campaigns"
        actions={<button className="btn btn-primary" onClick={() => navigate('/campaigns/new')}><Plus size={14} /> Create Campaign</button>}
      />
      <div className="page-body">
        <div className="card">
          {loading ? <Loading /> : campaigns.length === 0 ? (
            <EmptyState title="No campaigns yet" subtitle="Create your first WhatsApp campaign to reach your event recipients." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Campaign</th><th>Event</th><th>Recipients</th><th>Sent</th><th>Delivered</th>
                    <th>Read</th><th>Failed</th><th>Replies</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td style={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate(`/reports/${c.id}`)}>{c.name}</td>
                      <td>{c.event_name || '—'}</td>
                      <td>{c.stats.recipients}</td>
                      <td>{c.stats.sent + c.stats.delivered + c.stats.read}</td>
                      <td>{c.stats.delivered + c.stats.read}</td>
                      <td>{c.stats.read}</td>
                      <td>{c.stats.failed}</td>
                      <td>{c.stats.replies}</td>
                      <td><Badge status={c.status} /></td>
                      <td>
                        <div className="flex-gap">
                          <button className="btn btn-ghost btn-sm" title="View report" onClick={() => navigate(`/reports/${c.id}`)}><BarChart3 size={13} /></button>
                          {['queued', 'processing'].includes(c.status) && (
                            <button className="btn btn-ghost btn-sm" title="Pause" onClick={() => handlePause(c.id)}><Pause size={13} /></button>
                          )}
                          {c.status === 'paused' && (
                            <button className="btn btn-ghost btn-sm" title="Resume" onClick={() => handleResume(c.id)}><Play size={13} /></button>
                          )}
                          {!['completed', 'cancelled'].includes(c.status) && (
                            <button className="btn btn-ghost btn-sm" title="Cancel" onClick={() => handleCancel(c.id)}><XCircle size={13} /></button>
                          )}
                          {['draft', 'cancelled'].includes(c.status) && (
                            <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDelete(c.id)}><Trash2 size={13} /></button>
                          )}
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
    </>
  );
}
