import { useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import api from '../lib/api';
import { errorMessage } from '../lib/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');

    if (!password || !confirmPassword) {
      setError(
        'Please enter and confirm your new password.'
      );
      return;
    }

    if (password.length < 8) {
      setError(
        'Password must be at least 8 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      await api.post(
        `/auth/reset-password/${token}`,
        {
          password,
        }
      );

      setSuccess(true);

      setTimeout(() => {
        navigate('/login', {
          replace: true,
        });
      }, 1500);
    } catch (err) {
      setError(
        errorMessage(
          err,
          'This reset link is invalid or expired.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">

          <h1>Password Updated</h1>

          <p>
            Your password has been reset
            successfully.
          </p>

          <Link to="/login">
            Continue to Sign In
          </Link>

        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h1>Reset Password</h1>

        <p>
          Create a new password for your
          account.
        </p>

        <form onSubmit={handleSubmit}>

          <label>
            New Password
            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </label>

          <label>
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
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
              ? 'Updating...'
              : 'Reset Password'}
          </button>

        </form>

        <div className="auth-links">
          <Link to="/login">
            Back to Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}