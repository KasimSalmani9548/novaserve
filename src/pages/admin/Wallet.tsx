import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, Btn, Modal, Label, formatDate, formatINR, Badge } from '../../components/ui';
import { Pagination } from '../../components/Pagination';

export function AdminWallet() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [creditFor, setCreditFor] = useState<any>(null);
  const [debitFor, setDebitFor] = useState<any>(null);
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const load = () => api.get('/customers').then((d) => setCustomers(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCredit = (c: any) => { setCreditFor(c); setAmount(100); setNote(''); };
  const openDebit = (c: any) => { setDebitFor(c); setAmount(100); setNote(''); };

  const doCredit = async () => {
    await api.post('/wallet/add', { userId: creditFor.id, amount, note });
    setCreditFor(null); load();
  };
  const doDebit = async () => {
    try {
      await api.post('/wallet/deduct', { userId: debitFor.id, amount, note });
      setDebitFor(null); load();
    } catch (e: any) { alert(e.message); }
  };

  const openDetail = async (c: any) => {
    const d = await api.get(`/wallet/${c.id}`);
    setDetail({ customer: c, ...d });
  };

  const filtered = customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase()));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-100">Wallet & Transactions</h1>
      <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search customers..." />
      <Card>
        {filtered.length === 0 ? <Empty title="No customers" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs bg-slate-950/50">
                  <tr><th className="text-left p-3">Customer</th><th className="text-left p-3">Balance</th><th className="text-left p-3">Total Added</th><th className="text-left p-3">Total Spent</th><th className="text-right p-3">Actions</th></tr>
                </thead>
                <tbody>
                  {paged.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="p-3 text-slate-200">{c.name}<p className="text-xs text-slate-500">{c.email}</p></td>
                      <td className="p-3 text-emerald-400">{formatINR(c.wallet?.balance || 0)}</td>
                      <td className="p-3 text-slate-300">{formatINR(c.wallet?.totalAdded || 0)}</td>
                      <td className="p-3 text-slate-300">{formatINR(c.wallet?.totalSpent || 0)}</td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => openDetail(c)} className="text-slate-300 text-xs hover:underline">History</button>
                        <button onClick={() => openCredit(c)} className="text-emerald-400 text-xs hover:underline">+ Add</button>
                        <button onClick={() => openDebit(c)} className="text-rose-400 text-xs hover:underline">- Cut</button>
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

      <Modal open={!!creditFor} onClose={() => setCreditFor(null)} title={'Add Balance - ' + (creditFor?.name || '')}>
        <div className="space-y-3">
          <div><Label>Amount (Rs)</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for credit" /></div>
          <div className="flex gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setCreditFor(null)}>Cancel</Btn>
            <Btn onClick={doCredit} className="flex-1">Add Balance</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!debitFor} onClose={() => setDebitFor(null)} title={'Cut Balance - ' + (debitFor?.name || '')}>
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Current balance: {formatINR(debitFor?.wallet?.balance || 0)}</p>
          <div><Label>Amount to Cut (Rs)</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for deducting" /></div>
          <div className="flex gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setDebitFor(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={doDebit} className="flex-1">Cut Balance</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={'Transactions - ' + (detail?.customer?.name || '')}>
        {detail && (
          <div className="space-y-2 max-h-96 overflow-auto">
            {detail.transactions.length === 0 ? <Empty title="No transactions" /> : detail.transactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg text-sm">
                <div>
                  <p className="text-slate-300">{t.note}</p>
                  <p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p>
                </div>
                <div className="text-right">
                  <Badge tone={t.type === 'CREDIT' ? 'green' : 'red'}>{t.type === 'CREDIT' ? '+' : '-'}{formatINR(t.amount)}</Badge>
                  <p className="text-xs text-slate-500 mt-1">Bal: {formatINR(t.balanceAfter)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
