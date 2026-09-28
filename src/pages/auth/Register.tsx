import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/store';
import { Btn, Input, Label, Card } from '../../components/ui';
import { CheckCircle } from 'lucide-react';

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => ({ ...e, [k]: '' }));
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) errs.name = 'Name is required';
    else if (form.name.trim().length < 3) errs.name = 'Name must be at least 3 characters';

    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = 'Enter a valid email (e.g. name@gmail.com)';

    if (!form.mobile.trim()) errs.mobile = 'Mobile is required';
    else if (!/^[6-9]\d{9}$/.test(form.mobile.replace(/\D/g, ''))) errs.mobile = 'Enter a valid 10-digit Indian mobile number';

    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';

    return errs;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setBusy(true);
    try {
      await register({ ...form, mobile: form.mobile.replace(/\D/g, '') });
      setSuccess(true);
      setTimeout(() => {
        nav('/app/dashboard');
      }, 1800);
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
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Account Created!</h1>
          <p className="text-slate-400 text-sm mb-1">
            Welcome to NovaServe, {form.name.split(' ')[0]}.
          </p>
          <p className="text-slate-500 text-xs">Redirecting to your dashboard...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center text-slate-100 mb-1">Create Account</h1>
        <p className="text-center text-slate-500 text-sm mb-6">Join NovaServe</p>

        <form onSubmit={submit} className="space-y-3" noValidate>
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Your full name"
              className={fieldErrors.name ? 'border-red-500' : ''}
            />
            {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@example.com"
              className={fieldErrors.email ? 'border-red-500' : ''}
            />
            {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
          </div>

          <div>
            <Label>Mobile</Label>
            <Input
              type="tel"
              value={form.mobile}
              onChange={(e) => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              maxLength={10}
              className={fieldErrors.mobile ? 'border-red-500' : ''}
            />
            {fieldErrors.mobile && <p className="text-red-400 text-xs mt-1">{fieldErrors.mobile}</p>}
            <p className="text-xs text-slate-500 mt-1">{form.mobile.length}/10 digits</p>
          </div>

          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="At least 6 characters"
              className={fieldErrors.password ? 'border-red-500' : ''}
            />
            {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <Btn type="submit" disabled={busy} className="w-full">
            {busy ? 'Creating...' : 'Create Account'}
          </Btn>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account? <a href="/" className="text-emerald-400 hover:underline">Sign in</a>
        </p>
      </Card>
    </div>
  );
}
