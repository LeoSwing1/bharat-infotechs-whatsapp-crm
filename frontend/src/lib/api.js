import axios from 'axios';

const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ||
  'https://bharat-infotechs-whatsapp-crm-production.up.railway.app';

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bharat_crm_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('bharat_crm_token');
      localStorage.removeItem('bharat_crm_user');

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export function errorMessage(
  err,
  fallback = 'Something went wrong. Please try again.'
) {
  return (
    err?.response?.data?.error ||
    fallback
  );
}

export default api;