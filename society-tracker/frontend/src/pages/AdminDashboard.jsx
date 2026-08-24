import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../AuthContext';
import ComplaintHistory from '../components/ComplaintHistory';
import NoticeBoard from '../components/NoticeBoard';

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '' });
  const [expanded, setExpanded] = useState(null);
  const { user, logout } = useAuth();

  function loadComplaints() {
    const params = {};
    if (filters.category) params.category = filters.category;
    if (filters.status) params.status = filters.status;
    api.get('/complaints', { params }).then((res) => setComplaints(res.data));
  }

  function loadStats() {
    api.get('/dashboard').then((res) => setStats(res.data));
  }

  useEffect(() => { loadComplaints(); loadStats(); }, [filters]);

  async function updateStatus(id, status) {
    const note = prompt('Optional note for this status change:') || '';
    await api.patch(`/complaints/${id}/status`, { status, note });
    loadComplaints(); loadStats();
  }

  async function updatePriority(id, priority) {
    await api.patch(`/complaints/${id}/priority`, { priority });
    loadComplaints();
  }

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="topbar">
        <h2>Admin — {user.name}</h2>
        <button onClick={logout}>Log out</button>
      </div>

      {stats && (
        <div className="stats-bar">
          <div>Overdue: <strong>{stats.overdueCount}</strong></div>
          <div>By status: {stats.byStatus.map((s) => `${s.status}: ${s.count}`).join(', ') || '—'}</div>
          <div>By category: {stats.byCategory.map((c) => `${c.category}: ${c.count}`).join(', ') || '—'}</div>
        </div>
      )}

      <div className="row filters">
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All categories</option>
          <option>Plumbing</option><option>Electrical</option><option>Cleanliness</option><option>Security</option><option>Other</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option>Open</option><option>In Progress</option><option>Resolved</option>
        </select>
      </div>

      {complaints.length === 0 && <p className="muted">No complaints match these filters.</p>}
      {complaints.map((c) => (
        <div key={c.id} className={`card ${c.overdue ? 'overdue' : ''}`}>
          <strong>#{c.id} — {c.category}</strong>
          <span className="badge status">{c.status}</span>
          <span className={`badge priority-${c.priority}`}>{c.priority}</span>
          {c.overdue && <span className="badge overdue">Overdue</span>}
          <p>{c.description}</p>
          <div className="row">
            <select defaultValue={c.status} onChange={(e) => updateStatus(c.id, e.target.value)}>
              <option>Open</option><option>In Progress</option><option>Resolved</option>
            </select>
            <select defaultValue={c.priority} onChange={(e) => updatePriority(c.id, e.target.value)}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
            <button className="link-button" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
              {expanded === c.id ? 'Hide history' : 'View history'}
            </button>
          </div>
          {expanded === c.id && <ComplaintHistory complaintId={c.id} />}
        </div>
      ))}

      <NoticeBoard />
    </div>
  );
}
