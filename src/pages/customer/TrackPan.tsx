import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Btn, Input, Label, Spinner, Empty, Badge, formatDate } from '../../components/ui';

interface PanApp {
  id: string;
  fullName: string;
  ackNumber: string;
  pan: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  timeline: { status: string; at: string; note?: string }[];
}

const STATUS_FLOW = ['SUBMITTED', 'IN_PROCESS', 'APPROVED', 'COMPLETED'];

export function TrackPan() {
  const [ack, setAck] = useState('');
  const [apps, setApps] = useState<PanApp[]>([]);
  const [result, setResult] = useState<PanApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/pan/applications').then(setApps).finally(() => setLoading(false));
  }, []);

  const track = async () => {
    setErr(''); setResult(null);
    const code = ack.trim().toUpperCase();
    if (!code) { setErr('Enter your Acknowledgement Number'); return; }
    setBusy(true);
    try {
      const found = apps.find((a) => a.ackNumber === code);
      if (!found) {
        setErr('No application found with this Acknowledgement Number');
      } else {
        setResult(found);
      }
    } finally { setBusy(false); }
  };

  const currentStep = (status: string) => {
    if (status === 'REJECTED') return -1;
    return STATUS_FLOW.indexOf(status);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Track PAN Application</h1>
        <p className="text-sm text-slate-500 mt-1">Enter your acknowledgement number to check status</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <Label>Acknowledgement Number</Label>
          <Input
            value={ack}
            onChange={(e) => setAck(e.target.value.toUpperCase())}
            placeholder="ACK0000012345"
            className="font-mono tracking-wider"
          />
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <Btn onClick={track} disabled={busy || !ack.trim()} className="w-full">
          {busy ? 'Searching...' : 'Track Application'}
        </Btn>
      </Card>

      {result && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-100">{result.fullName}</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{result.ackNumber}</p>
              </div>
              <Badge tone={result.status === 'COMPLETED' ? 'green' : result.status === 'REJECTED' ? 'red' : 'yellow'}>
                {result.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500 text-xs">PAN Number</p><p className="font-mono text-slate-200">{result.pan}</p></div>
              <div><p className="text-slate-500 text-xs">Applied On</p><p className="text-slate-300">{formatDate(result.createdAt)}</p></div>
              <div><p className="text-slate-500 text-xs">Last Updated</p><p className="text-slate-300">{formatDate(result.updatedAt)}</p></div>
            </div>
          </Card>

          {result.status !== 'REJECTED' && (
            <Card className="p-6">
              <h2 className="font-semibold text-slate-100 mb-4">Progress</h2>
              <div className="space-y-4">
                {STATUS_FLOW.map((step, i) => {
                  const done = i <= currentStep(result.status);
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        {done ? 'OK' : i + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${done ? 'text-slate-100' : 'text-slate-500'}`}>{step.replace('_', ' ')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="font-semibold text-slate-100 mb-3">Timeline</h2>
            <ol className="space-y-3">
              {result.timeline.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{t.status.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-500">{formatDate(t.at)}{t.note ? ' - ' + t.note : ''}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}

      <Card>
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-slate-100">My Applications</h2>
          <p className="text-xs text-slate-500 mt-0.5">Click one to auto-fill its ACK number</p>
        </div>
        {apps.length === 0 ? <Empty title="No applications yet" /> : (
          <ul className="divide-y divide-slate-800">
            {apps.map((a) => (
              <li key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-950/50 cursor-pointer" onClick={() => { setAck(a.ackNumber); setResult(a); }}>
                <div>
                  <p className="text-sm text-slate-200">{a.fullName}</p>
                  <p className="text-xs text-slate-500 font-mono">{a.ackNumber}</p>
                </div>
                <Badge tone={a.status === 'COMPLETED' ? 'green' : a.status === 'REJECTED' ? 'red' : 'yellow'}>
                  {a.status.replace('_', ' ')}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
