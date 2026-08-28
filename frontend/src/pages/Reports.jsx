import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PageHeader from '../components/PageHeader';
import { Badge, EmptyState, Loading } from '../components/ui';

export default function Reports() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState(null);

  useEffect(() => { api.get('/campaigns').then((res) => setCampaigns(res.data)); }, []);

  return (
    <>
      <PageHeader title="Campaign Reports" />
      <div className="page-body">
        <div className="card">
          {!campaigns ? <Loading /> : campaigns.length === 0 ? (
            <EmptyState title="No campaign reports yet" subtitle="Reports appear once you send your first campaign." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Campaign</th><th>Recipients</th><th>Sent</th><th>Delivered</th><th>Read</th><th>Failed</th><th>Replies</th><th>Status</th></tr></thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/reports/${c.id}`)}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.stats.recipients}</td>
                      <td>{c.stats.sent + c.stats.delivered + c.stats.read}</td>
                      <td>{c.stats.delivered + c.stats.read}</td>
                      <td>{c.stats.read}</td>
                      <td>{c.stats.failed}</td>
                      <td>{c.stats.replies ?? 0}</td>
                      <td><Badge status={c.status} /></td>
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
