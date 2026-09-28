import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Btn, Input, Label, Spinner, Empty, Badge, formatDate, formatINR } from '../../components/ui';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Clock } from 'lucide-react';

interface Topup {
  id: string;
  amount: number;
  utr: string;
  status: string;
  note: string;
  createdAt: string;
}

const QR_VALID_SECONDS = 300;
const AMOUNT_STEP = 100;
const MIN_AMOUNT = 100;

export function AddMoney() {
  const [settings, setSettings] = useState<{ upiId: string; payeeName: string; minTopup: number; maxTopup: number } | null>(null);
  const [amount, setAmount] = useState(100);
  const [utr, setUtr] = useState('');
  const [list, setList] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(QR_VALID_SECONDS);
  const [qrKey, setQrKey] = useState(0);
  const timerRef = useRef<any>(null);

  const load = async () => {
    const [s, l] = await Promise.all([
      api.get('/settings/public'),
      api.get('/wallet/topup-requests'),
    ]);
    setSettings(s);
    setList(Array.isArray(l) ? l : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(QR_VALID_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qrKey]);

  const refreshQr = () => { setQrKey((k) => k + 1); setErr(''); setOk(''); };

  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setOk('');
    if (amount < MIN_AMOUNT) { setErr(`Minimum top-up is Rs ${MIN_AMOUNT}`); return; }
    if (amount % AMOUNT_STEP !== 0) { setErr(`Amount must be a multiple of Rs ${AMOUNT_STEP}`); return; }
    if (!utr || utr.length < 6) { setErr('Enter a valid UTR'); return; }
    setBusy(true);
    try {
      await api.post('/wallet/topup-request', { amount, utr });
      setOk('Top-up request submitted. Admin will verify shortly.');
      setUtr('');
      const l = await api.get('/wallet/topup-requests');
      setList(Array.isArray(l) ? l : []);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;
  if (!settings) return <p className="text-slate-400">Settings unavailable.</p>;

  const upiUri = `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Wallet Top-up')}`;
  const expired = secondsLeft <= 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Add Money to Wallet</h1>
        <p className="text-sm text-slate-500 mt-1">Pay via UPI, then submit your UTR number</p>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <p className="text-xs text-slate-500">Payee UPI ID</p>
          <p className="font-mono text-lg text-emerald-400">{settings.upiId}</p>
          <p className="text-xs text-slate-500 mt-1">Payee: {settings.payeeName}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label>Amount (Rs)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={MIN_AMOUNT} step={AMOUNT_STEP} />
            <p className="text-xs text-slate-500 mt-1">Min Rs {MIN_AMOUNT} · Multiples of {AMOUNT_STEP}</p>

            <div className="flex gap-2 mt-3 flex-wrap">
              {[100, 200, 300, 500, 1000].map((a) => (
                <button key={a} type="button" onClick={() => setAmount(a)}
                  className={`px-3 py-1.5 rounded text-xs ${amount === a ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
                  {a}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <a href={expired ? undefined : upiUri} className={expired ? 'pointer-events-none opacity-50 block' : 'block'}>
                <Btn className="w-full" disabled={expired}>Open UPI App</Btn>
              </a>
              <p className="text-xs text-slate-500 text-center">Or scan QR →</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-white rounded-lg p-4 relative">
            {expired ? (
              <div className="flex flex-col items-center justify-center" style={{ width: 200, height: 200 }}>
                <Clock className="w-12 h-12 text-rose-500 mb-2" />
                <p className="text-rose-600 font-bold text-sm">QR Expired</p>
                <p className="text-xs text-slate-500 mt-1">5 minutes up</p>
              </div>
            ) : (
              <>
                <QRCodeSVG key={qrKey} value={upiUri} size={200} level="M" />
                <div className="flex items-center gap-1 mt-3 text-xs font-mono font-bold">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span className={secondsLeft < 60 ? 'text-rose-600' : 'text-slate-700'}>{mmss(secondsLeft)} left</span>
                </div>
              </>
            )}

            <button type="button" onClick={refreshQr}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900">
              <RefreshCw className="w-3 h-3" /> Refresh QR / New 5 min
            </button>

            <p className="text-xs text-slate-700 mt-2 text-center font-medium">
              Amount: <span className="font-bold text-emerald-700">{formatINR(amount)}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5">
          <h3 className="font-semibold text-slate-100 mb-3">After paying, submit your UTR</h3>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>UTR / Transaction Reference *</Label>
              <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 412345678901" />
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            {ok && <p className="text-emerald-400 text-sm">{ok}</p>}
            <Btn type="submit" disabled={busy} className="w-full">{busy ? 'Submitting...' : 'Submit Top-up Request'}</Btn>
          </form>
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-slate-100">My Top-up Requests</h2>
        </div>
        {list.length === 0 ? <Empty title="No top-up requests yet" /> : (
          <ul className="divide-y divide-slate-800">
            {list.map((t) => (
              <li key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-slate-200 font-medium">{formatINR(t.amount)}</p>
                  <p className="text-xs text-slate-500 font-mono">UTR: {t.utr}</p>
                  <p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p>
                  {t.note && <p className="text-xs text-red-400 mt-1">{t.note}</p>}
                </div>
                <Badge tone={t.status === 'APPROVED' ? 'green' : t.status === 'REJECTED' ? 'red' : 'yellow'}>{t.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
