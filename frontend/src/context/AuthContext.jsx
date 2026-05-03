import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preAuthToken, setPreAuthToken] = useState(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState(null); // 'totp', 'email', 'both'

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authAPI.getProfile();
      setUser(data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const signup = async (email, password) => {
    const { data } = await authAPI.signup(email, password);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await authAPI.login(email, password);

    // 2FA required
    if (data.requires_2fa) {
      setPreAuthToken(data.pre_auth_token);
      setTwoFactorMethod(data.method);
      return { requires_2fa: true };
    }

    // Normal login
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    await loadUser();
    return { requires_2fa: false };
  };

  const verify2FA = async (totpCode) => {
    if (!preAuthToken) throw new Error('No pre-auth token');
    const { data } = await authAPI.verifyLogin2FA(preAuthToken, totpCode);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setPreAuthToken(null);
    setTwoFactorMethod(null);
    await loadUser();
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore — token may already be expired
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setPreAuthToken(null);
    setTwoFactorMethod(null);
  };

  const logoutAll = async () => {
    await authAPI.logoutAll();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const refreshProfile = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        preAuthToken,
        twoFactorMethod,
        signup,
        login,
        verify2FA,
        logout,
        logoutAll,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
