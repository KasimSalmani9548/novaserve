import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Btn, Input, Label, Spinner } from '../../components/ui';
import { Save, Wallet, CreditCard } from 'lucide-react';

export function AdminPricing() {
  const [settings, setSettings] = useState<any>({
    upiId: '',
    payeeName: '',
    minTopup: 100,
    maxTopup: 50000,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const s = await api.get('/settings/public');
    setSettings({
      upiId: s.upiId || '',
      payeeName: s.payeeName || '',
      minTopup: s.minTopup || 100,
      maxTopup: s.maxTopup || 50000,
    });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true); setMsg('');
    try {
      await api.put('/settings/upi', settings);
      setMsg('Settings saved successfully');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Payment & Wallet Settings</h1>
          <p className="text-sm text-slate-500">Manage UPI details and wallet limits</p>
        </div>
      </div>

      {msg && (
        <div className={'p-3 rounded-lg border text-sm ' + (msg.startsWith('Error') ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300')}>
          {msg}
        </div>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-slate-100 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" /> Wallet Top-up Limits
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Minimum Top-up (Rs)</Label>
            <Input type="number" value={settings.minTopup} onChange={(e) => setSettings({ ...settings, minTopup: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Maximum Top-up (Rs)</Label>
            <Input type="number" value={settings.maxTopup} onChange={(e) => setSettings({ ...settings, maxTopup: Number(e.target.value) })} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-slate-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" /> UPI Payment Settings
        </h2>
        <div>
          <Label>UPI ID</Label>
          <Input value={settings.upiId} onChange={(e) => setSettings({ ...settings, upiId: e.target.value })} placeholder="yourbusiness@upi" />
          <p className="text-xs text-slate-500 mt-1">Customers will pay to this UPI ID</p>
        </div>
        <div>
          <Label>Payee Name</Label>
          <Input value={settings.payeeName} onChange={(e) => setSettings({ ...settings, payeeName: e.target.value })} placeholder="Your Business Name" />
          <p className="text-xs text-slate-500 mt-1">Name shown in UPI app to customers</p>
        </div>
      </Card>

      <Btn onClick={save} disabled={busy} className="w-full">
        <Save className="w-4 h-4 inline mr-2" />
        {busy ? 'Saving...' : 'Save Settings'}
      </Btn>

      <Card className="p-4 bg-slate-950/50 border-slate-800">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-400">Note:</strong> To change <strong>PAN Find</strong> or <strong>Aadhaar PVC</strong> charges — go to <strong>Services</strong> page and edit those services.
        </p>
      </Card>
    </div>
  );
}
