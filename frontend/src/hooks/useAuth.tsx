import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; full_name: string; password: string; location?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('agrimind_token');
    if (token) {
      api.me().then(setUser).catch(() => localStorage.removeItem('agrimind_token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('agrimind_token', res.access_token);
    setUser(res.user);
  };

  const register = async (data: { email: string; full_name: string; password: string; location?: string }) => {
    const res = await api.register(data);
    localStorage.setItem('agrimind_token', res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('agrimind_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
