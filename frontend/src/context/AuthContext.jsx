import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import api from '../lib/api';

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    const raw = localStorage.getItem('bharat_crm_user');

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Invalid stored user:', error);

    localStorage.removeItem('bharat_crm_user');

    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
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
        /*
         * Backend returns:
         *
         * {
         *   user: {...}
         * }
         *
         * Therefore we must use res.data.user.
         */
        const validUser = res.data?.user;

        if (!validUser || typeof validUser !== 'object') {
          throw new Error('Invalid user response from server.');
        }

        const safeUser = {
          ...validUser,
          name: validUser.name || validUser.email || 'User',
        };

        localStorage.setItem(
          'bharat_crm_user',
          JSON.stringify(safeUser)
        );

        setUser(safeUser);
      })
      .catch((error) => {
        console.error('Session validation failed:', error);
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

    if (!data?.token || !data?.user) {
      throw new Error('Invalid login response from server.');
    }

    const safeUser = {
      ...data.user,
      name: data.user.name || data.user.email || 'User',
    };

    localStorage.setItem(
      'bharat_crm_token',
      data.token
    );

    localStorage.setItem(
      'bharat_crm_user',
      JSON.stringify(safeUser)
    );

    setUser(safeUser);

    return safeUser;
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