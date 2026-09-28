import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Btn, Input, Label, Spinner, formatINR } from '../../components/ui';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Clock, Wallet as WalletIcon } from 'lucide-react';
import type { Wallet as W } from '../../lib/types';

const QR_VALID_SECONDS = 300;
const MIN_AMOUNT = 100;

export function CustomerWallet() {
  const [wallet, setWallet] = useState<W | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [amountInput, setAmountInput] = useState<string>('100');
  const [utr, setUtr] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(QR_VALID_SECONDS);
  const [qrKey, setQrKey] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const timerRef = useRef<any>(null);

  const load = async () => {
    const [w, s] = await Promise.all([
      api.get('/wallet'),
      api.get('/settings/public'),
    ]);
    setWallet(w.wallet);
    setSettings(s);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!showQR) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(QR_VALID_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qrKey, showQR]);

  const refreshQr = () => { setQrKey((k) => k + 1); setErr(''); setOk(''); };
  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };
  const cleanAmount = (): number => {
    const n = Number(amountInput);
    if (!n || isNaN(n) || n < MIN_AMOUNT) return MIN_AMOUNT;
    return n;
  };
  const onAmountBlur = () => {
    const n = Number(amountInput);
    if (!n || isNaN(n) || n < MIN_AMOUNT) setAmountInput(String(MIN_AMOUNT));
  };
  const bumpAmount = (dir: 1 | -1) => {
    const current = cleanAmount();
    const next = current + dir * 100;
    if (next < MIN_AMOUNT) { setAmountInput(String(MIN_AMOUNT)); return; }
    setAmountInput(String(next));
    setShowQR(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setOk('');
    const amt = cleanAmount();
    if (amt < MIN_AMOUNT) { setErr('Minimum top-up is Rs ' + MIN_AMOUNT); return; }
    if (!utr || utr.length < 6) { setErr('Enter a valid UTR'); return; }
    setBusy(true);
    try {
      await api.post('/wallet/topup-request', { amount: amt, utr });
      setOk('Top-up request submitted. Admin will verify shortly.');
      setUtr('');
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  const amount = cleanAmount();
  const upiUri = settings ? 'upi://pay?pa=' + encodeURIComponent(settings.upiId) + '&pn=' + encodeURIComponent(settings.payeeName) + '&am=' + amount + '&cu=INR&tn=' + encodeURIComponent('Wallet Top-up') : '';
  const expired = secondsLeft <= 0;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Wallet</h1>
        <p className="text-sm text-slate-500 mt-1">Balance, add money, and transactions</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Balance</p>
          <p className="text-xl font-bold text-emerald-400">{formatINR(wallet?.balance || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Total Added</p>
          <p className="text-xl font-bold text-slate-100">{formatINR(wallet?.totalAdded || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Total Spent</p>
          <p className="text-xl font-bold text-slate-100">{formatINR(wallet?.totalSpent || 0)}</p>
        </Card>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <WalletIcon size={18} className="text-emerald-400" />
          <h2 className="font-semibold text-slate-100">Add Money</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Amount (Rs)</Label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => bumpAmount(-1)} className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-lg">-</button>
              <Input type="number" value={amountInput} onChange={(e) => { setAmountInput(e.target.value); setShowQR(false); }} onBlur={onAmountBlur} min={MIN_AMOUNT} className="text-center font-mono text-lg" />
              <button type="button" onClick={() => bumpAmount(1)} className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-lg">+</button>
            </div>
            <p className="text-xs text-slate-500">Min Rs {MIN_AMOUNT}</p>

            <div className="flex gap-2 flex-wrap">
              {[100, 200, 300, 500, 1000].map((a) => (
                <button key={a} type="button" onClick={() => { setAmountInput(String(a)); setShowQR(false); }}
                  className={'px-3 py-1.5 rounded text-xs ' + (amount === a ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200')}>
                  {a}
                </button>
              ))}
            </div>

            {!showQR && (
              <Btn onClick={() => setShowQR(true)} disabled={amount < MIN_AMOUNT} className="w-full">
                Submit - Pay Rs {amount}
              </Btn>
            )}
          </div>

          {showQR && settings && (
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Pay to UPI</p>
                <p className="font-mono text-base text-slate-200">{settings.upiId}</p>
              </div>

              <div className="flex flex-col items-center justify-center bg-white rounded-lg p-4">
                {expired ? (
                  <div className="flex flex-col items-center justify-center" style={{ width: 200, height: 200 }}>
                    <Clock className="w-12 h-12 text-rose-500 mb-2" />
                    <p className="text-rose-600 font-bold text-sm">QR Expired</p>
                  </div>
                ) : (
                  <div>
                    <QRCodeSVG key={qrKey} value={upiUri} size={200} level="M" />
                    <div className="flex items-center justify-center gap-1 mt-3 text-xs font-mono font-bold">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <span className={secondsLeft < 60 ? 'text-rose-600' : 'text-slate-700'}>{mmss(secondsLeft)} left</span>
                    </div>
                  </div>
                )}
                <button type="button" onClick={refreshQr} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900">
                  <RefreshCw className="w-3 h-3" /> Refresh QR
                </button>
                <p className="text-xs text-slate-700 mt-2 font-medium">Rs {amount}</p>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h3 className="font-semibold text-slate-100 mb-2">Submit UTR after payment</h3>
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
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
