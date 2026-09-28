import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/store';
import { Btn, Input, Label, Card } from '../../components/ui';
import { CheckCircle } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  // role auto-detected by backend
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await login(email, password);
      setSuccess(true);
      setTimeout(() => {
        nav(user?.role === 'ADMIN' ? '/admin/dashboard' : '/app/dashboard');
      }, 1000);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Welcome back!</h1>
          <p className="text-slate-400 text-sm">Signing you in...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center text-slate-100 mb-1">NovaServe</h1>
        <p className="text-center text-slate-500 text-sm mb-6">Customer & Admin Service Portal</p>
<form onSubmit={submit} className="space-y-3">
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <Btn type="submit" disabled={busy} className="w-full">{busy ? 'Signing in...' : 'Sign In'}</Btn>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          New here? <a href="/register" className="text-emerald-400 hover:underline">Create account</a>
        </p>
      </Card>
    </div>
  );
}
