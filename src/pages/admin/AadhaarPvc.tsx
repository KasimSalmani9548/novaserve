import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, Badge, formatDate, formatINR } from '../../components/ui';
import { Pagination } from '../../components/Pagination';

export function AdminAadhaarPvc() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    api.get('/aadhaar-pvc/requests').then((d) => setItems(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => items.filter((r) =>
    !q || (r.userName || '').toLowerCase().includes(q.toLowerCase()) || (r.userEmail || '').toLowerCase().includes(q.toLowerCase()) || (r.orderId || '').includes(q)
  ), [items, q]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const revenue = items.reduce((s, r) => s + (r.charge || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-100">Aadhaar PVC Requests</h1>
        <Card className="px-4 py-2">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="text-sm font-semibold text-emerald-400">{formatINR(revenue)}</p>
        </Card>
      </div>

      <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by customer, email, or order ID..." />

      <Card>
        {filtered.length === 0 ? <Empty title="No requests yet" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs bg-slate-950/50">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">File</th>
                    <th className="text-left p-3">Order ID</th>
                    <th className="text-left p-3">Amount</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr key={r.id} className="border-t border-slate-800">
                      <td className="p-3 text-slate-400 text-xs">{formatDate(r.createdAt)}</td>
                      <td className="p-3 text-slate-200">
                        {r.userName}
                        <p className="text-xs text-slate-500">{r.userEmail}</p>
                      </td>
                      <td className="p-3 text-slate-300 text-xs">{r.fileName}</td>
                      <td className="p-3 font-mono text-xs text-slate-400">{r.orderId}</td>
                      <td className="p-3 text-emerald-400">{formatINR(r.charge)}</td>
                      <td className="p-3"><Badge tone="green">{r.status}</Badge></td>
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
