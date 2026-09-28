import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, Badge, Btn, formatDate, formatINR } from '../../components/ui';
import { Pagination } from '../../components/Pagination';

export function AdminTopups() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const load = () => api.get('/wallet/topup-requests').then((d) => setList(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => list.filter((t) =>
    !q || t.userName.toLowerCase().includes(q.toLowerCase()) || t.utr.includes(q)
  ), [list, q]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const doDelete = async (id: string) => { if (!confirm('Delete this top-up request?')) return; try { await api.del('/wallet/topup-requests/' + id); await load(); } catch (e: any) { alert(e.message); } };
  const approve = async (id: string) => {
    setBusy(id);
    try { await api.post(`/wallet/topup-requests/${id}/approve`); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  };

  const reject = async (id: string) => {
    const note = prompt('Reason for rejection (optional):') || 'Rejected by admin';
    setBusy(id);
    try { await api.post(`/wallet/topup-requests/${id}/reject`, { note }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  const pending = list.filter((t) => t.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-100">Top-up Requests</h1>
        <Card className="px-4 py-2">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="text-sm font-semibold text-amber-400">{pending}</p>
        </Card>
      </div>

      <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by customer or UTR..." />

      <Card>
        {filtered.length === 0 ? <Empty title="No top-up requests" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs bg-slate-950/50">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Amount</th>
                    <th className="text-left p-3">UTR</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((t) => (
                    <tr key={t.id} className="border-t border-slate-800">
                      <td className="p-3 text-slate-400 text-xs">{formatDate(t.createdAt)}</td>
                      <td className="p-3 text-slate-200">{t.userName}</td>
                      <td className="p-3 text-emerald-400 font-semibold">{formatINR(t.amount)}</td>
                      <td className="p-3 font-mono text-xs text-slate-300">{t.utr}</td>
                      <td className="p-3"><Badge tone={t.status === 'APPROVED' ? 'green' : t.status === 'REJECTED' ? 'red' : 'yellow'}>{t.status}</Badge></td>
                      <td className="p-3 text-right space-x-2">
                        {t.status === 'PENDING' && (
                          <>
                            <Btn variant="primary" disabled={busy === t.id} onClick={() => approve(t.id)}>Approve</Btn>
                            <Btn variant="danger" disabled={busy === t.id} onClick={() => reject(t.id)}>Reject</Btn>
                            <Btn variant="danger" disabled={busy === t.id} onClick={() => doDelete(t.id)}>Delete</Btn>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
          </>
        )}
      </Card>
    </div>
  );
}
