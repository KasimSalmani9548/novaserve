import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, StatusBadge, formatDate, formatINR } from '../../components/ui';
import { Pagination } from '../../components/Pagination';
import type { Order } from '../../lib/types';

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { api.get('/orders').then(setOrders).finally(() => setLoading(false)); }, []);

  const filtered = useMemo(() => orders
    .filter((o) => !status || o.status === status)
    .filter((o) => !q || o.serviceName.toLowerCase().includes(q.toLowerCase()) || o.customerName.toLowerCase().includes(q.toLowerCase()) || o.id.includes(q)),
  [orders, q, status]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const doDelete = async (id: string) => { if (!confirm('Delete this order permanently?')) return; try { await api.del('/orders/' + id); setOrders(orders.filter((o) => o.id !== id)); } catch (e: any) { alert(e.message); } };
  const getOrderUrl = (o: Order) => {
    if (o.serviceId === 'pan-find') return '/admin/pan-finds';
    return `/admin/orders/${o.id}`;
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-100">Orders</h1>
      <div className="flex flex-col md:flex-row gap-3">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by customer, service, order ID..." />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100">
          <option value="">All Statuses</option>
          {['PENDING', 'PROCESSING', 'DOCUMENT_REQUIRED', 'COMPLETED', 'REJECTED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      <Card>
        {filtered.length === 0 ? <Empty title="No orders found" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs bg-slate-950/50">
                  <tr><th className="text-left p-3">Order ID</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Service</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Date</th><th className="text-left p-3">Status</th><th className="text-right p-3">Action</th></tr>
                </thead>
                <tbody>
                  {paged.map((o) => (
                    <tr key={o.id} className="border-t border-slate-800">
                      <td className="p-3 font-mono text-xs text-slate-400">{o.id}</td>
                      <td className="p-3 text-slate-200">{o.customerName}</td>
                      <td className="p-3 text-slate-200">
                        {o.serviceName}
                        {o.serviceId === 'pan-find' && <span className="ml-2 text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded">PAN Find</span>}
                      </td>
                      <td className="p-3 text-slate-200">{formatINR(o.amount)}</td>
                      <td className="p-3 text-slate-400 text-xs">{formatDate(o.createdAt)}</td>
                      <td className="p-3"><StatusBadge status={o.status} /></td>
                      <td className="p-3 text-right"><Link to={getOrderUrl(o)} className="text-emerald-400 hover:underline text-xs">Manage</Link>
                        <button onClick={() => doDelete(o.id)} className="text-rose-400 hover:underline text-xs ml-2">Delete</button></td>
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
