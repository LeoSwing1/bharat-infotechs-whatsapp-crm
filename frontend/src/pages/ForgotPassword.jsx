import { useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../lib/api';
import { errorMessage } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post(
        '/auth/forgot-password',
        {
          email,
        }
      );

      setMessage(
        data.message ||
          'If an account exists, a reset link has been requested.'
      );
    } catch (err) {
      setError(
        errorMessage(
          err,
          'Unable to process your request.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h1>Forgot Password?</h1>

        <p>
          Enter your email address and we'll
          help you reset your password.
        </p>

        <form onSubmit={handleSubmit}>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="you@company.com"
              autoComplete="email"
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Sending...'
              : 'Send Reset Link'}
          </button>

        </form>

        <div className="auth-links">
          Remember your password?{' '}
          <Link to="/login">
            Sign in
          </Link>
        </div>

      </div>
    </div>
  );
}