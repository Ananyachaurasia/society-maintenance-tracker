import { useEffect, useState } from 'react';
import api from '../api/client';

export default function ComplaintHistory({ complaintId }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get(`/complaints/${complaintId}/history`).then((res) => setHistory(res.data));
  }, [complaintId]);

  return (
    <ul className="history-list">
      {history.map((h) => (
        <li key={h.id}>
          {h.old_status ? `${h.old_status} → ${h.new_status}` : `Created (${h.new_status})`} by {h.actor_name} on{' '}
          {new Date(h.created_at).toLocaleString()}
          {h.note ? ` — "${h.note}"` : ''}
        </li>
      ))}
    </ul>
  );
}

