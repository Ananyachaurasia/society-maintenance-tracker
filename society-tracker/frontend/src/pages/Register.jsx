import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'resident' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div className="auth-page">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Name" value={form.name} onChange={update('name')} />
        <input placeholder="Email" value={form.email} onChange={update('email')} />
        <input placeholder="Password" type="password" value={form.password} onChange={update('password')} />
        <select value={form.role} onChange={update('role')}>
          <option value="resident">Resident</option>
          <option value="admin">Admin</option>
        </select>
        {error && <p className="error-text">{error}</p>}
        <button type="submit">Register</button>
      </form>
      <p className="muted" style={{ marginTop: 14 }}>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
