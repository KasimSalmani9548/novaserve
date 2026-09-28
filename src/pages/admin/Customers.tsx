import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, Badge, Btn, formatINR } from '../../components/ui';
import { Pagination } from '../../components/Pagination';

export function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const load = () => api.get('/customers').then(setCustomers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => customers.filter((c) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase())
  ), [customers, q]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const doDelete = async (c: any) => { if (!confirm('Delete ' + c.name + '? This removes all their orders and wallet.')) return; try { await api.del('/customers/' + c.id); load(); } catch (e: any) { alert(e.message); } };
  const toggle = async (c: any) => {
    await api.put(`/customers/${c.id}`, { active: !c.active });
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-100">Customers</h1>
      <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search customers..." />
      <Card>
        {filtered.length === 0 ? <Empty title="No customers found" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs bg-slate-950/50">
                  <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Mobile</th><th className="text-left p-3">Wallet</th><th className="text-left p-3">Orders</th><th className="text-left p-3">Status</th><th className="text-right p-3">Action</th></tr>
                </thead>
                <tbody>
                  {paged.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="p-3 text-slate-200">{c.name}</td>
                      <td className="p-3 text-slate-400 text-xs">{c.email}</td>
                      <td className="p-3 text-slate-400 text-xs">{c.mobile || '-'}</td>
                      <td className="p-3 text-emerald-400">{formatINR(c.wallet?.balance || 0)}</td>
                      <td className="p-3 text-slate-300">{c.orderCount}</td>
                      <td className="p-3"><Badge tone={c.active ? 'green' : 'red'}>{c.active ? 'Active' : 'Disabled'}</Badge></td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Btn variant={c.active ? 'danger' : 'primary'} onClick={() => toggle(c)} className="!px-3 !py-1 !text-xs">{c.active ? 'Disable' :
'Activate'}</Btn>
                          <Btn variant="danger" onClick={() => doDelete(c)} className="!px-3 !py-1 !text-xs">Delete</Btn>
                        </div>
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
