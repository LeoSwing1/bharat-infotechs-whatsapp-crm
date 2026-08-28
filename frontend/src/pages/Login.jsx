import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';
import ShaderBackground from '../components/ShaderBackground';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@bharatinfotechs.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role) {
    if (role === 'admin') {
      setEmail('admin@bharatinfotechs.com');
      setPassword('Admin@123');
    } else {
      setEmail('client@bharatinfotechs.com');
      setPassword('Client@123');
    }
  }

  return (
    <div className="login-page" style={{ position: 'relative', overflow: 'hidden', background: '#073d30' }}>
      <ShaderBackground />
      <div className="login-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="login-brand">
          <h1>Bharat Infotechs</h1>
          <p>Smart Business Software, Built for Growth.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
          Demo access:{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo('admin')}>Admin</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo('client')}>Client</button>
        </div>
      </div>
    </div>
  );
}
