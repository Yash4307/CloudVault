import { useState, useCallback } from 'react';
import { loginUser, registerUser, getProfile } from './api';
import AuthContext from './auth-context';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await getProfile();
      setUser(response.data);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, []);

  // Initialize auth on first render
  if (!initialized) {
    setInitialized(true);
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await loginUser({ email, password });
      localStorage.setItem('token', response.data.access_token);
      setLoading(true);
      await fetchProfile();
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const register = async (email, username, password) => {
    setError(null);
    try {
      const response = await registerUser({ email, username, password });
      localStorage.setItem('token', response.data.access_token);
      setLoading(true);
      await fetchProfile();
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
