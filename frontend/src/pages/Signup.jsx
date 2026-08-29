import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (
      !form.name ||
      !form.companyName ||
      !form.email ||
      !form.password
    ) {
      setError('Please complete all required fields.');
      return;
    }

    if (form.password.length < 8) {
      setError(
        'Password must be at least 8 characters.'
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      await register({
        name: form.name,
        companyName: form.companyName,
        email: form.email,
        password: form.password,
      });

      navigate('/', {
        replace: true,
      });
    } catch (err) {
      setError(
        errorMessage(
          err,
          'Unable to create your account.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h1>Bharat Infotechs</h1>

        <p>
          Create your CRM account
        </p>

        <form onSubmit={handleSubmit}>

          <label>
            Your Name
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                update('name', e.target.value)
              }
              placeholder="Your name"
              autoComplete="name"
            />
          </label>

          <label>
            Company Name
            <input
              type="text"
              value={form.companyName}
              onChange={(e) =>
                update(
                  'companyName',
                  e.target.value
                )
              }
              placeholder="Company name"
              autoComplete="organization"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                update(
                  'email',
                  e.target.value
                )
              }
              placeholder="you@company.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                update(
                  'password',
                  e.target.value
                )
              }
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </label>

          <label>
            Confirm Password
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                update(
                  'confirmPassword',
                  e.target.value
                )
              }
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Creating account...'
              : 'Create Account'}
          </button>

        </form>

        <div className="auth-links">
          Already have an account?{' '}
          <Link to="/login">
            Sign in
          </Link>
        </div>

      </div>
    </div>
  );
}