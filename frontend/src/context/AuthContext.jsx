import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('bharat_crm_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem('bharat_crm_user');
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('bharat_crm_token');
    localStorage.removeItem('bharat_crm_user');
    setUser(null);
  }, []);

  /*
   * Validate the stored token when the application starts.
   */
  useEffect(() => {
    const token = localStorage.getItem('bharat_crm_token');

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((res) => {
        const validUser = res.data;

        localStorage.setItem(
          'bharat_crm_user',
          JSON.stringify(validUser)
        );

        setUser(validUser);
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clearAuth]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', {
      email,
      password,
    });

    localStorage.setItem('bharat_crm_token', data.token);
    localStorage.setItem(
      'bharat_crm_user',
      JSON.stringify(data.user)
    );

    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}