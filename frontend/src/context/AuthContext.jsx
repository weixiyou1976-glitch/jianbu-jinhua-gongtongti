import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (raw && token) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        if (!parsed.referral_code) {
          api
            .getMe()
            .then(({ user: fresh }) => {
              const merged = { ...parsed, referral_code: fresh.referral_code };
              localStorage.setItem('user', JSON.stringify(merged));
              setUser(merged);
            })
            .catch(() => {});
        }
      } catch {
        localStorage.removeItem('user');
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    function handleLocked() {
      setUser(null);
    }
    window.addEventListener('account-locked', handleLocked);
    return () => window.removeEventListener('account-locked', handleLocked);
  }, []);

  function login(token, userData) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
