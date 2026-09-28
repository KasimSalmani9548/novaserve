import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Badge, Input, StatusBadge, formatDate, formatINR } from '../../components/ui';
import { Pagination } from '../../components/Pagination';
import { Receipt, TrendingUp, TrendingDown, ShoppingBag, Filter, Clock } from 'lucide-react';
import type { Order } from '../../lib/types';

type FilterType = 'ALL' | 'CREDIT' | 'DEBIT' | 'SERVICE' | 'REFUND';
type Tab = 'TRANSACTIONS' | 'ORDERS' | 'TOPUPS';

export function Transactions() {
  const [tab, setTab] = useState<Tab>('TRANSACTIONS');
  const [txns, setTxns] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [orderStatus, setOrderStatus] = useState('');
  const [topupStatus, setTopupStatus] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    Promise.all([
      api.get('/wallet'),
      api.get('/orders'),
      api.get('/wallet/topup-requests'),
    ]).then(([w, o, tu]) => {
      setTxns(w.transactions || []);
      setOrders(o || []);
      setTopups(Array.isArray(tu) ? tu : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredTxns = txns
    .filter((t) => {
      if (filter === 'ALL') return true;
      if (filter === 'CREDIT') return t.type === 'CREDIT' && !(t.note || '').toLowerCase().includes('refund');
      if (filter === 'DEBIT') return t.type === 'DEBIT';
      if (filter === 'SERVICE') return t.type === 'DEBIT' && !(t.note || '').toLowerCase().includes('admin deduction');
      if (filter === 'REFUND') return (t.note || '').toLowerCase().includes('refund');
      return true;
    })
    .filter((t) => !q || (t.note || '').toLowerCase().includes(q.toLowerCase()) || String(t.amount).includes(q));

  const filteredOrders = orders
    .filter((o) => !orderStatus || o.status === orderStatus)
    .filter((o) => !q || o.serviceName.toLowerCase().includes(q.toLowerCase()) || o.id.toLowerCase().includes(q.toLowerCase()));

  const filteredTopups = topups
    .filter((t) => !topupStatus || t.status === topupStatus)
    .filter((t) => !q || String(t.amount).includes(q) || (t.utr || '').toLowerCase().includes(q.toLowerCase()));

  const pagedTxns = filteredTxns.slice((page - 1) * perPage, page * perPage);
  const pagedOrders = filteredOrders.slice((page - 1) * perPage, page * perPage);
  const pagedTopups = filteredTopups.slice((page - 1) * perPage, page * perPage);

  const totalCredit = txns.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
  const totalDebit = txns.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'CREDIT', label: 'Credit' },
    { key: 'DEBIT', label: 'Debit' },
    { key: 'SERVICE', label: 'Service Orders' },
    { key: 'REFUND', label: 'Refunds' },
  ];

  const getOrderUrl = (o: Order) => {
    if (o.serviceId === 'pan-find' || o.serviceId === 'svc-pan-find') return '/app/pan-find';
    if (o.serviceId === 'aadhaar-pvc' || o.serviceId === 'svc-aadhaar-pvc') return '/app/aadhaar-pvc';
    return '/app/orders/' + o.id;
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Transactions & Orders</h1>
          <p className="text-sm text-slate-500">All wallet activity and service orders</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
        <button onClick={() => { setTab('TRANSACTIONS'); setPage(1); setQ(''); }}
          className={'px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ' + (tab === 'TRANSACTIONS' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
          <Receipt className="w-4 h-4" /> Transactions
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">{txns.length}</span>
        </button>
        <button onClick={() => { setTab('ORDERS'); setPage(1); setQ(''); }}
          className={'px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ' + (tab === 'ORDERS' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
          <ShoppingBag className="w-4 h-4" /> My Orders
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">{orders.length}</span>
        </button>
        <button onClick={() => { setTab('TOPUPS'); setPage(1); setQ(''); }}
          className={'px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ' + (tab === 'TOPUPS' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
          <Clock className="w-4 h-4" /> My Top-up Requests
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">{topups.length}</span>
        </button>
      </div>

      {tab === 'TRANSACTIONS' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-400" /><p className="text-xs text-slate-500">Total Credited</p></div><p className="text-xl font-bold text-emerald-400">{formatINR(totalCredit)}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-rose-400" /><p className="text-xs text-slate-500">Total Debited</p></div><p className="text-xl font-bold text-rose-400">{formatINR(totalDebit)}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Total Transactions</p><p className="text-xl font-bold text-slate-100">{txns.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Net Balance</p><p className={'text-xl font-bold ' + (totalCredit - totalDebit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{formatINR(totalCredit - totalDebit)}</p></Card>
        </div>
      )}

      {tab === 'ORDERS' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Total Orders</p><p className="text-xl font-bold text-slate-100">{orders.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Pending</p><p className="text-xl font-bold text-amber-400">{orders.filter((o) => ['PENDING', 'PROCESSING', 'DOCUMENT_REQUIRED'].includes(o.status)).length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Completed</p><p className="text-xl font-bold text-emerald-400">{orders.filter((o) => o.status === 'COMPLETED').length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Rejected</p><p className="text-xl font-bold text-rose-400">{orders.filter((o) => o.status === 'REJECTED').length}</p></Card>
        </div>
      )}

      {tab === 'TOPUPS' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Total Top-ups</p><p className="text-xl font-bold text-slate-100">{topups.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Approved</p><p className="text-xl font-bold text-emerald-400">{topups.filter((t) => t.status === 'APPROVED').length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Pending</p><p className="text-xl font-bold text-amber-400">{topups.filter((t) => t.status === 'PENDING').length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Rejected</p><p className="text-xl font-bold text-rose-400">{topups.filter((t) => t.status === 'REJECTED').length}</p></Card>
        </div>
      )}

      {tab === 'TRANSACTIONS' && (
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
              className={'px-4 py-2 rounded-full text-sm font-medium border transition ' + (filter === f.key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-600 hover:text-emerald-400')}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 items-center">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder={tab === 'TRANSACTIONS' ? 'Search by note or amount...' : tab === 'ORDERS' ? 'Search by service or order ID...' : 'Search by UTR or amount...'}
          className="flex-1" />
        {tab === 'ORDERS' && (
          <select value={orderStatus} onChange={(e) => { setOrderStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100">
            <option value="">All Statuses</option>
            {['PENDING', 'PROCESSING', 'DOCUMENT_REQUIRED', 'COMPLETED', 'REJECTED', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        )}
        {tab === 'TOPUPS' && (
          <select value={topupStatus} onChange={(e) => { setTopupStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
          <Filter className="w-4 h-4" />
          {tab === 'TRANSACTIONS' ? filteredTxns.length : tab === 'ORDERS' ? filteredOrders.length : filteredTopups.length} results
        </div>
      </div>

      {tab === 'TRANSACTIONS' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs bg-slate-950/50">
                <tr><th className="text-left p-3">Date & Time</th><th className="text-left p-3">Type</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Description</th><th className="text-right p-3">Balance After</th></tr>
              </thead>
              <tbody>
                {pagedTxns.length === 0 ? <tr><td colSpan={5} className="text-center py-12"><Empty title="No transactions found" /></td></tr>
                  : pagedTxns.map((t) => (
                    <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-950/50">
                      <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(t.createdAt)}</td>
                      <td className="p-3"><Badge tone={t.type === 'CREDIT' ? 'green' : 'red'}>{t.type}</Badge></td>
                      <td className={'p-3 font-semibold whitespace-nowrap ' + (t.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400')}>{t.type === 'CREDIT' ? '+' : '-'}{formatINR(t.amount)}</td>
                      <td className="p-3 text-slate-300 text-xs">{t.note}</td>
                      <td className="p-3 text-right text-slate-300 whitespace-nowrap">{formatINR(t.balanceAfter)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {filteredTxns.length > 0 && <Pagination total={filteredTxns.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />}
        </Card>
      )}

      {tab === 'ORDERS' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs bg-slate-950/50">
                <tr><th className="text-left p-3">Order ID</th><th className="text-left p-3">Service</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Date</th><th className="text-left p-3">Status</th><th className="text-right p-3">Action</th></tr>
              </thead>
              <tbody>
                {pagedOrders.length === 0 ? <tr><td colSpan={6} className="text-center py-12"><Empty title="No orders found" /></td></tr>
                  : pagedOrders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-800 hover:bg-slate-950/50">
                      <td className="p-3 font-mono text-xs text-slate-400 whitespace-nowrap">{o.id}</td>
                      <td className="p-3 text-slate-200">{o.serviceName}{(o.serviceId === 'pan-find' || o.serviceId === 'svc-pan-find') && <span className="ml-2 text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded">PAN Find</span>}</td>
                      <td className="p-3 text-slate-200 whitespace-nowrap">{formatINR(o.amount)}</td>
                      <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td className="p-3"><StatusBadge status={o.status} /></td>
                      <td className="p-3 text-right"><Link to={getOrderUrl(o)} className="text-emerald-400 hover:underline text-xs">View</Link></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {filteredOrders.length > 0 && <Pagination total={filteredOrders.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />}
        </Card>
      )}

      {tab === 'TOPUPS' && (
        <Card>
          <ul className="divide-y divide-slate-800">
            {pagedTopups.length === 0 ? (
              <Empty title="No top-up requests yet" />
            ) : (
              pagedTopups.map((t) => (
                <li key={t.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 font-medium">{formatINR(t.amount)}</p>
                    <p className="text-xs text-slate-500 font-mono">UTR: {t.utr}</p>
                    <p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p>
                    {t.note && <p className="text-xs text-rose-400 mt-1">{t.note}</p>}
                  </div>
                  <Badge tone={t.status === 'APPROVED' ? 'green' : t.status === 'REJECTED' ? 'red' : 'yellow'}>{t.status}</Badge>
                </li>
              ))
            )}
          </ul>
          {filteredTopups.length > 0 && <Pagination total={filteredTopups.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />}
        </Card>
      )}

      <div className="text-sm text-slate-500 pl-1">
        <strong className="text-slate-300">{tab === 'TRANSACTIONS' ? filteredTxns.length : tab === 'ORDERS' ? filteredOrders.length : filteredTopups.length}</strong> Total Entries
      </div>
    </div>
  );
}
