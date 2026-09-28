import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/store';
import { api } from '../../lib/api';
import { Card, Btn, Input, Label } from '../../components/ui';
import { User, Save } from 'lucide-react';

export function AdminSettings() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', password: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      const body: any = { name: form.name, email: form.email };
      if (form.password) body.password = form.password;
      await api.put('/profile', body);
      await refresh();
      setForm({ ...form, password: '' });
      setMsg('Profile updated successfully');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <User className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="text-sm text-slate-500">Manage your admin profile</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Admin name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@example.com" />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current" />
            <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
          </div>

          {msg && (
            <div className={'p-3 rounded-lg border text-sm ' + (msg.startsWith('Error') ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300')}>
              {msg}
            </div>
          )}

          <Btn type="submit" disabled={busy} className="w-full">
            <Save className="w-4 h-4 inline mr-2" />
            {busy ? 'Saving...' : 'Save Changes'}
          </Btn>
        </form>
      </Card>

      <Card className="p-4 bg-slate-950/50 border-slate-800">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-400">Note:</strong> To change UPI, charges, and other pricing — go to <strong>Pricing</strong> page.
        </p>
      </Card>
    </div>
  );
}
