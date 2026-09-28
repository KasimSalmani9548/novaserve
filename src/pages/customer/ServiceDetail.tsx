import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Spinner, Btn, Input, Label, Textarea, formatINR } from '../../components/ui';
import type { Service, Wallet } from '../../lib/types';

interface DocFile { name: string; size: number; type: string; data: string; }

export function ServiceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'details' | 'form' | 'review'>('details');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/services'), api.get('/wallet')])
      .then(([ss, w]) => {
        setService(ss.find((s: Service) => s.id === id) || null);
        setWallet(w.wallet);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024;
    setErr('');
    for (const f of files) {
      if (!allowed.includes(f.type)) { setErr('Unsupported file: ' + f.name); return; }
      if (f.size > maxSize) { setErr('File too large: ' + f.name + ' (max 5MB)'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        setDocs((d) => [...d, { name: f.name, size: f.size, type: f.type, data: String(reader.result) }]);
      };
      reader.readAsDataURL(f);
    }
  };

  const removeDoc = (i: number) => setDocs((d) => d.filter((_, idx) => idx !== i));

  const confirm = async () => {
    setErr(''); setBusy(true);
    try {
      const order = await api.post('/orders', { serviceId: service!.id, formData, documents: docs });
      nav(`/app/orders/${order.id}`);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;
  if (!service) return <p className="text-slate-400">Service not found.</p>;

  const remaining = (wallet?.balance || 0) - service.price;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => nav(-1)} className="text-sm text-slate-400 hover:text-slate-100">Back</button>

      <Card className="p-6">
        <h1 className="text-2xl font-bold text-slate-100">{service.name}</h1>
        <p className="text-slate-400 mt-2">{service.description}</p>
        <p className="text-2xl font-bold text-emerald-400 mt-4">{formatINR(service.price)}</p>
      </Card>

      {step === 'details' && (
        <Card className="p-6 space-y-4">
          <div className="text-sm text-slate-300 space-y-1">
            <div className="flex justify-between"><span>Wallet Balance</span><span>{formatINR(wallet?.balance || 0)}</span></div>
            <div className="flex justify-between"><span>Service Price</span><span>{formatINR(service.price)}</span></div>
            <div className="flex justify-between font-semibold border-t border-slate-800 pt-2"><span>Remaining Balance</span><span className={remaining < 0 ? 'text-red-400' : 'text-emerald-400'}>{formatINR(remaining)}</span></div>
          </div>
          {remaining < 0 && <p className="text-red-400 text-sm">Insufficient wallet balance. Please add balance to continue.</p>}
          <Btn onClick={() => setStep('form')} disabled={remaining < 0} className="w-full">Apply / Order</Btn>
        </Card>
      )}

      {step === 'form' && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-slate-100">Enter Required Information</h2>
          <div><Label>Full Name</Label><Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><Label>Contact Number</Label><Input value={formData.contact || ''} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} /></div>
          <div><Label>Additional Details</Label><Textarea rows={3} value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>

          {service.requiresDocuments && (
            <div>
              <Label>Upload Documents {service.documentHint ? '(' + service.documentHint + ')' : ''}</Label>
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={onFile} className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-100" />
              {docs.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {docs.map((d, i) => (
                    <li key={i} className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg text-sm">
                      <span className="truncate text-slate-300">{d.name} <span className="text-slate-500">({(d.size / 1024).toFixed(1)} KB)</span></span>
                      <button onClick={() => removeDoc(i)} className="text-red-400 text-xs">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {err && <p className="text-red-400 text-sm">{err}</p>}
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setStep('details')}>Back</Btn>
            <Btn onClick={() => setStep('review')} className="flex-1">Review Order</Btn>
          </div>
        </Card>
      )}

      {step === 'review' && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-slate-100">Review Order</h2>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-400">Service</span><span className="text-slate-200">{service.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Price</span><span className="text-slate-200">{formatINR(service.price)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Wallet Balance</span><span className="text-slate-200">{formatINR(wallet?.balance || 0)}</span></div>
            <div className="flex justify-between font-semibold border-t border-slate-800 pt-2"><span>Remaining After</span><span className="text-emerald-400">{formatINR(remaining)}</span></div>
            {docs.length > 0 && <p className="text-slate-400 text-xs pt-2">{docs.length} document(s) attached</p>}
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setStep('form')}>Back</Btn>
            <Btn onClick={confirm} disabled={busy} className="flex-1">{busy ? 'Placing...' : 'Confirm Order'}</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
