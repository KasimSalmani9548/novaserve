import { useState } from 'react';
import { useAuth } from '../../lib/store';
import { api } from '../../lib/api';
import { Card, Btn, Input, Label } from '../../components/ui';

export function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '', mobile: user?.mobile || '', email: user?.email || '',
    address: user?.address || '', photo: user?.photo || '', password: '',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      const body: any = { ...form };
      if (!body.password) delete body.password;
      await api.put('/profile', body);
      await refresh();
      setMsg('Profile updated');
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-slate-100">Profile</h1>
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-emerald-400">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold text-slate-100">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.role}</p>
          </div>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
          <div><Label>New Password (leave blank to keep current)</Label><Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} /></div>
          {msg && <p className="text-emerald-400 text-sm">{msg}</p>}
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <Btn type="submit">Save Changes</Btn>
        </form>
      </Card>
    </div>
  );
}
