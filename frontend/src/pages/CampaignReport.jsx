import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import PageHeader from '../components/PageHeader';
import { StatCard, Badge, Loading } from '../components/ui';

export default function CampaignReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    api.get(`/reports/campaigns/${id}`).then((res) => setData(res.data));
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  if (!data) return <><PageHeader title="Campaign Report" /><div className="page-body"><Loading /></div></>;

  const { campaign, summary, failedMessages, messages } = data;
  const filteredMessages = filter === 'all' ? messages : messages.filter((m) => m.status === filter);

  return (
    <>
      <PageHeader
        title={campaign.name}
        actions={(
          <>
            <button className="btn btn-secondary" onClick={() => navigate('/reports')}><ArrowLeft size={14} /> Back</button>
            <a className="btn btn-secondary" href={`/api/reports/campaigns/${id}/export`} target="_blank" rel="noreferrer"><Download size={14} /> Export CSV</a>
          </>
        )}
      />
      <div className="page-body">
        <div className="flex-gap mb-16">
          <Badge status={campaign.status} />
          <span className="text-sm muted">Created {new Date(campaign.created_at).toLocaleString()}</span>
        </div>

        <div className="stats-grid">
          <StatCard label="Recipients" value={summary.recipients} />
          <StatCard label="Queued" value={summary.queued} color="var(--color-info)" bg="var(--color-info-light)" />
          <StatCard label="Sent" value={summary.sent} />
          <StatCard label="Delivered" value={summary.delivered} color="var(--color-success)" bg="var(--color-success-light)" />
          <StatCard label="Read" value={summary.read} color="var(--color-success)" bg="var(--color-success-light)" />
          <StatCard label="Failed" value={summary.failed} color="var(--color-danger)" bg="var(--color-danger-light)" />
        </div>

        <div className="card mb-16">
          <div className="card-pad flex-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Recipient Messages</h3>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <option value="all">All statuses</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Phone</th><th>Status</th><th>Sent</th><th>Delivered</th><th>Read</th><th>Error</th></tr></thead>
              <tbody>
                {filteredMessages.slice(0, 300).map((m) => (
                  <tr key={m.id}>
                    <td>{m.phone}</td>
                    <td><Badge status={m.status} /></td>
                    <td className="text-sm muted">{m.sent_at ? new Date(m.sent_at).toLocaleTimeString() : '—'}</td>
                    <td className="text-sm muted">{m.delivered_at ? new Date(m.delivered_at).toLocaleTimeString() : '—'}</td>
                    <td className="text-sm muted">{m.read_at ? new Date(m.read_at).toLocaleTimeString() : '—'}</td>
                    <td className="text-sm" style={{ color: 'var(--color-danger)' }}>{m.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {failedMessages.length > 0 && (
          <div className="card">
            <div className="card-pad" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--color-danger)' }}>Failed Message Details</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Phone</th><th>Error</th><th>Retries</th><th>Failed At</th></tr></thead>
                <tbody>
                  {failedMessages.map((m) => (
                    <tr key={m.id}>
                      <td>{m.phone}</td>
                      <td className="text-sm" style={{ color: 'var(--color-danger)' }}>{m.error}</td>
                      <td>{m.retry_count}</td>
                      <td className="text-sm muted">{m.failed_at ? new Date(m.failed_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
