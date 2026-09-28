import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Btn, Input, Label, Spinner, Empty, Badge, formatDate } from '../../components/ui';
import { Pagination } from '../../components/Pagination';

interface PanRequest {
  id: string;
  aadhaar: string;
  pan: string;
  nameOnPan: string;
  panStatus: string;
  charge: number;
  status: string;
  createdAt: string;
  note?: string;
}

export function PanFind() {
  const [aadhaar, setAadhaar] = useState('');
  const [charge, setCharge] = useState(15);
  const [list, setList] = useState<PanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const load = async () => {
    setLoadErr('');
    try {
      const [l, c] = await Promise.all([
        api.get('/pan/history').catch((e: any) => { setLoadErr(e.message || 'Could not load history'); return []; }),
        api.get('/pan/charge').catch(() => ({ charge: 15 })),
      ]);
      setList(Array.isArray(l) ? l : []);
      setCharge(c?.charge || 15);
    } catch (e: any) {
      setLoadErr(e.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setOk('');
    const digits = aadhaar.replace(/\D/g, '');
    if (digits.length !== 12) { setErr('Aadhaar must be 12 digits'); return; }
    setBusy(true);
    try {
      const res = await api.post('/pan/request', { aadhaar: digits });
      setAadhaar('');

        if (res.status === 'APPROVED' && res.pan) {
          setOk('PAN found: ' + res.pan + ' - see table below.');
        } else if (res.status === 'REJECTED') {
          setErr('Something went wrong. Rs ' + (res.charge || 15) + ' has been refunded to your wallet. Please contact admin.');
        } else {
          setOk('Request submitted.');
        }

            await load();
      setPage(1);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  const pagedList = list.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">PAN Find Service</h1>
        <p className="text-sm text-slate-500 mt-1">Submit Aadhaar - admin will find and share PAN</p>
      </div>

      {loadErr && (
        <Card className="p-4 border-red-700/50">
          <p className="text-red-400 text-sm">{loadErr}</p>
          <button onClick={load} className="text-xs text-emerald-400 hover:underline mt-1">Retry</button>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-slate-100">Find PAN by Aadhaar</h2>
        <p className="text-sm text-slate-400">Enter the customer's 12-digit Aadhaar number to continue.</p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Customer Aadhaar Number *</Label>
            <Input value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="123456789012" inputMode="numeric" className="font-mono tracking-wider" />
            <p className="text-xs text-slate-500 mt-1">{aadhaar.length}/12 digits</p>
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          {ok && <p className="text-emerald-400 text-sm">{ok}</p>}
          <div className="text-sm text-slate-300 border-t border-slate-800 pt-3">
            <div className="flex justify-between"><span>Service Charge</span><span>Rs {charge}</span></div>
          </div>
          <Btn type="submit" disabled={busy || aadhaar.length !== 12} className="w-full">
            {busy ? 'Submitting...' : `Submit Request - Pay Rs ${charge}`}
          </Btn>
        </form>
      </Card>

      <Card>
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-slate-100">My PAN Find Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">PAN will appear here after admin approval</p>
        </div>
        {list.length === 0 ? <Empty title="No requests yet" subtitle="Submit an Aadhaar above to start." /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs bg-slate-950/50">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Aadhaar</th>
                    <th className="text-left p-3">PAN</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.map((h) => (
                    <tr key={h.id} className="border-t border-slate-800">
                      <td className="p-3 text-slate-400 text-xs">{formatDate(h.createdAt)}</td>
                      <td className="p-3 font-mono text-xs text-slate-400">XXXX XXXX {(h.aadhaar || '').slice(-4)}</td>
                      <td className="p-3 font-mono text-slate-200">{h.pan || '-'}</td>
                      <td className="p-3 text-slate-300">{h.nameOnPan || '-'}</td>
                      <td className="p-3">
                        <Badge tone={h.status === 'APPROVED' ? 'green' : h.status === 'REJECTED' ? 'red' : 'yellow'}>
                          {h.status || 'PENDING'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={list.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
          </>
        )}
      </Card>
    </div>
  );
}
