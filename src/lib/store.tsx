import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from './api';
import type { User } from './types';

interface AuthCtx {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; mobile: string; password: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try { const me = await api.get('/auth/me'); setUser(me); }
    catch { setToken(null); setUser(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.token); setUser(res.user);
  };
  const register = async (data: any) => {
    const res = await api.post('/auth/register', data);
    setToken(res.token); setUser(res.user);
  };
  const logout = () => { setToken(null); setUser(null); };
  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
