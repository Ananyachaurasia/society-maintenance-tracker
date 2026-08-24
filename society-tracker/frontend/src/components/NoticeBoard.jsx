import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../AuthContext';

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);
  const { user } = useAuth();

  function load() {
    api.get('/notices').then((res) => setNotices(res.data));
  }

  useEffect(load, []);

  async function post(e) {
    e.preventDefault();
    await api.post('/notices', { title, body, is_important: important });
    setTitle(''); setBody(''); setImportant(false);
    load();
  }

  return (
    <div>
      <h3 className="section-title">Notice Board</h3>
      {user.role === 'admin' && (
        <div className="form-section">
          <form onSubmit={post}>
            <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea placeholder="Notice text" value={body} onChange={(e) => setBody(e.target.value)} />
            <label className="row muted">
              <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} style={{ width: 'auto' }} />
              Mark as important (pins it + emails residents)
            </label>
            <button type="submit" style={{ alignSelf: 'flex-start' }}>Post notice</button>
          </form>
        </div>
      )}
      {notices.length === 0 && <p className="muted">No notices yet.</p>}
      {notices.map((n) => (
        <div key={n.id} className={`card ${n.is_important ? 'important' : ''}`}>
          <strong>{n.is_important ? '📌 ' : ''}{n.title}</strong>
          <p>{n.body}</p>
          <small className="muted">{new Date(n.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
