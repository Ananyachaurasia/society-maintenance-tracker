import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../AuthContext';
import ComplaintHistory from '../components/ComplaintHistory';
import NoticeBoard from '../components/NoticeBoard';

export default function ResidentDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [category, setCategory] = useState('Plumbing');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const { user, logout } = useAuth();

  function load() {
    api.get('/complaints').then((res) => setComplaints(res.data));
  }

  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('category', category);
    formData.append('description', description);
    if (photo) formData.append('photo', photo);
    await api.post('/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setDescription(''); setPhoto(null);
    load();
  }

  return (
    <div className="page">
      <div className="topbar">
        <h2>Welcome, {user.name}</h2>
        <button onClick={logout}>Log out</button>
      </div>

      <div className="form-section">
        <h3 style={{ marginTop: 0 }}>Raise a complaint</h3>
        <form onSubmit={submit}>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Plumbing</option>
            <option>Electrical</option>
            <option>Cleanliness</option>
            <option>Security</option>
            <option>Other</option>
          </select>
          <textarea placeholder="Describe the issue" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} style={{ border: 'none', padding: 0 }} />
          <button type="submit" style={{ alignSelf: 'flex-start' }}>Submit complaint</button>
        </form>
      </div>

      <h3 className="section-title">Your complaints</h3>
      {complaints.length === 0 && <p className="muted">No complaints yet.</p>}
      {complaints.map((c) => (
        <div key={c.id} className={`card ${c.overdue ? 'overdue' : ''}`}>
          <strong>#{c.id} — {c.category}</strong>
          <span className="badge status">{c.status}</span>
          {c.overdue && <span className="badge overdue">Overdue</span>}
          <p>{c.description}</p>
          {c.photo_url && (
            <img
              className="photo-thumb"
              src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${c.photo_url}`}
              alt=""
              width={140}
            />
          )}
          <div>
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
