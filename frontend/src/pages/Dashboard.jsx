import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarDays, Send, Clock, Loader, CheckCircle2, Eye, XCircle, MessageCircle } from 'lucide-react';
import api from '../lib/api';
import PageHeader from '../components/PageHeader';
import { StatCard, Badge, Loading } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/reports/dashboard').then((res) => setData(res.data)).catch(() => {});
  }, []);

  if (!data) return <><PageHeader title="Dashboard" /><div className="page-body"><Loading /></div></>;

  const t = data.totals;

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={(
          <>
            <button className="btn btn-secondary" onClick={() => navigate('/contacts')}>Add Contact</button>
            <button className="btn btn-secondary" onClick={() => navigate('/events')}>Create Event</button>
            <button className="btn btn-primary" onClick={() => navigate('/campaigns')}>Create Campaign</button>
          </>
        )}
      />
      <div className="page-body">
        <div className="stats-grid">
          <StatCard label="Total Contacts" value={t.totalContacts} icon={<Users size={17} />} />
          <StatCard label="Total Events" value={t.totalEvents} icon={<CalendarDays size={17} />} color="var(--color-info)" bg="var(--color-info-light)" />
          <StatCard label="Total Campaigns" value={t.totalCampaigns} icon={<Send size={17} />} />
          <StatCard label="Scheduled Campaigns" value={t.scheduledCampaigns} icon={<Clock size={17} />} color="var(--color-info)" bg="var(--color-info-light)" />
          <StatCard label="Active Campaigns" value={t.activeCampaigns} icon={<Loader size={17} />} color="var(--color-warning)" bg="var(--color-warning-light)" />
          <StatCard label="Messages Queued" value={t.messagesQueued} icon={<Clock size={17} />} color="var(--color-warning)" bg="var(--color-warning-light)" />
          <StatCard label="Messages Sent" value={t.messagesSent} icon={<Send size={17} />} />
          <StatCard label="Delivered" value={t.delivered} icon={<CheckCircle2 size={17} />} color="var(--color-success)" bg="var(--color-success-light)" />
          <StatCard label="Read" value={t.read} icon={<Eye size={17} />} color="var(--color-success)" bg="var(--color-success-light)" />
          <StatCard label="Failed" value={t.failed} icon={<XCircle size={17} />} color="var(--color-danger)" bg="var(--color-danger-light)" />
          <StatCard label="Replies" value={t.replies} icon={<MessageCircle size={17} />} color="var(--color-info)" bg="var(--color-info-light)" />
        </div>

        <div className="card">
          <div className="card-pad" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Recent Campaigns</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th><th>Event</th><th>Recipients</th><th>Sent</th><th>Delivered</th>
                  <th>Read</th><th>Failed</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCampaigns.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 30 }}>No campaigns yet.</td></tr>
                )}
                {data.recentCampaigns.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/reports/${c.id}`)}>
                    <td>{c.name}</td>
                    <td>{c.event_name || '—'}</td>
                    <td>{c.recipients}</td>
                    <td>{c.sent}</td>
                    <td>{c.delivered}</td>
                    <td>{c.read}</td>
                    <td>{c.failed}</td>
                    <td><Badge status={c.status} /></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
