import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Badge, Input, StatusBadge, Btn, formatDate, formatINR } from '../../components/ui';
import { Pagination } from '../../components/Pagination';
import { ShoppingBag, CheckCircle, Wallet as WalletIcon, Users, TrendingUp, TrendingDown, Filter, Search, Receipt } from 'lucide-react';
import type { Order } from '../../lib/types';

type Tab = 'ORDERS' | 'TOPUPS' | 'WALLET';
type OrderFilter = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
type TopupFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export function AdminManage() {
  const [tab, setTab] = useState<Tab>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Separate search per tab
  const [qOrders, setQOrders] = useState('');
  const [qTopups, setQTopups] = useState('');
  const [qWallet, setQWallet] = useState('');

  // Separate filter per tab
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('ALL');
  const [topupFilter, setTopupFilter] = useState<TopupFilter>('ALL');

  // Separate page per tab
  const [pageOrders, setPageOrders] = useState(1);
  const [pageTopups, setPageTopups] = useState(1);
  const [pageWallet, setPageWallet] = useState(1);

  const [perPage, setPerPage] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);

  const [walletDetail, setWalletDetail] = useState<any>(null);
  const [creditFor, setCreditFor] = useState<any>(null);
  const [debitFor, setDebitFor] = useState<any>(null);
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState('');

  const load = async () => {
    try {
      const [o, tu, c] = await Promise.all([
        api.get('/orders'),
        api.get('/wallet/topup-requests'),
        api.get('/customers'),
      ]);
      setOrders(o || []);
      setTopups(Array.isArray(tu) ? tu : []);
      setCustomers(Array.isArray(c) ? c : []);

      const allTxns: any[] = [];
      for (const cust of (c || [])) {
        try {
          const w = await api.get('/wallet/' + cust.id);
          (w.transactions || []).forEach((t: any) => {
            allTxns.push({ ...t, customerName: cust.name, customerEmail: cust.email });
          });
        } catch {}
      }
      allTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTxns(allTxns);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Current tab's search value and page
  const q = tab === 'ORDERS' ? qOrders : tab === 'TOPUPS' ? qTopups : qWallet;
  const setQ = (v: string) => {
    if (tab === 'ORDERS') { setQOrders(v); setPageOrders(1); }
    else if (tab === 'TOPUPS') { setQTopups(v); setPageTopups(1); }
    else { setQWallet(v); setPageWallet(1); }
  };
  const page = tab === 'ORDERS' ? pageOrders : tab === 'TOPUPS' ? pageTopups : pageWallet;
  const setPage = (p: number) => {
    if (tab === 'ORDERS') setPageOrders(p);
    else if (tab === 'TOPUPS') setPageTopups(p);
    else setPageWallet(p);
  };

  console.log('[DEBUG] tab=' + tab + ', orderFilter=' + orderFilter + ', orders=' + orders.length + ', filteredOrders=' + (orders.filter(o => orderFilter === 'ALL' || o.status === orderFilter).length));
  const filteredOrders = orders
    .filter((o) => orderFilter === 'ALL' || o.status === orderFilter)
    .filter((o) => !qOrders || o.id.toLowerCase().includes(qOrders.toLowerCase()) || (o.customerName || '').toLowerCase().includes(qOrders.toLowerCase()) || (o.serviceName || '').toLowerCase().includes(qOrders.toLowerCase()));

  const filteredTopups = topups
    .filter((t) => topupFilter === 'ALL' || t.status === topupFilter)
    .filter((t) => !qTopups || (t.userName || '').toLowerCase().includes(qTopups.toLowerCase()) || (t.utr || '').toLowerCase().includes(qTopups.toLowerCase()));

  const filteredTxns = txns
    .filter((t) => !qWallet || (t.note || '').toLowerCase().includes(qWallet.toLowerCase()) || (t.customerName || '').toLowerCase().includes(qWallet.toLowerCase()));

  const pagedOrders = filteredOrders.slice((pageOrders - 1) * perPage, pageOrders * perPage);
  const pagedTopups = filteredTopups.slice((pageTopups - 1) * perPage, pageTopups * perPage);
  const pagedTxns = filteredTxns.slice((pageWallet - 1) * perPage, pageWallet * perPage);

  const orderPending = orders.filter((o) => ['PENDING', 'PROCESSING', 'DOCUMENT_REQUIRED'].includes(o.status)).length;
  const orderCompleted = orders.filter((o) => o.status === 'COMPLETED').length;
  const orderRejected = orders.filter((o) => o.status === 'REJECTED').length;

  const topupPending = topups.filter((t) => t.status === 'PENDING').length;
  const topupApproved = topups.filter((t) => t.status === 'APPROVED').length;
  const topupRejected = topups.filter((t) => t.status === 'REJECTED').length;

  const totalCredit = txns.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
  const totalDebit = txns.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
  const totalWalletBalance = customers.reduce((s, c) => s + (c.wallet?.balance || 0), 0);

  const approveTopup = async (id: string) => {
    setBusy(id);
    try { await api.post('/wallet/topup-requests/' + id + '/approve'); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  };
  const rejectTopup = async (id: string) => {
    const n = prompt('Reason for rejection:') || 'Rejected by admin';
    setBusy(id);
    try { await api.post('/wallet/topup-requests/' + id + '/reject', { note: n }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  };

  const doCredit = async () => {
    await api.post('/wallet/add', { userId: creditFor.id, amount, note });
    setCreditFor(null); load();
  };
  const doDebit = async () => {
    try { await api.post('/wallet/deduct', { userId: debitFor.id, amount, note }); setDebitFor(null); load(); }
    catch (e: any) { alert(e.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Manage Reports</h1>
          <p className="text-sm text-slate-500">Orders, top-ups, and wallet transactions in one place</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
        <button onClick={() => setTab('ORDERS')}
          className={'px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ' + (tab === 'ORDERS' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
          <ShoppingBag className="w-4 h-4" /> Orders
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">{orders.length}</span>
        </button>
        <button onClick={() => setTab('TOPUPS')}
          className={'px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ' + (tab === 'TOPUPS' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
          <CheckCircle className="w-4 h-4" /> Top-up Requests
          {topupPending > 0 && <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">{topupPending}</span>}
          {topupPending === 0 && <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">{topups.length}</span>}
        </button>
        <button onClick={() => setTab('WALLET')}
          className={'px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ' + (tab === 'WALLET' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200')}>
          <WalletIcon className="w-4 h-4" /> Wallet & Transactions
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">{txns.length}</span>
        </button>
      </div>

      {tab === 'ORDERS' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Total Orders</p><p className="text-xl font-bold text-slate-100">{orders.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Pending</p><p className="text-xl font-bold text-amber-400">{orderPending}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Completed</p><p className="text-xl font-bold text-emerald-400">{orderCompleted}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Rejected</p><p className="text-xl font-bold text-rose-400">{orderRejected}</p></Card>
        </div>
      )}
      {tab === 'TOPUPS' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Total Top-ups</p><p className="text-xl font-bold text-slate-100">{topups.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Pending</p><p className="text-xl font-bold text-amber-400">{topupPending}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Approved</p><p className="text-xl font-bold text-emerald-400">{topupApproved}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Rejected</p><p className="text-xl font-bold text-rose-400">{topupRejected}</p></Card>
        </div>
      )}
      {tab === 'WALLET' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-slate-400" /><p className="text-xs text-slate-500">Customers</p></div><p className="text-xl font-bold text-slate-100">{customers.length}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-400" /><p className="text-xs text-slate-500">Total Credited</p></div><p className="text-xl font-bold text-emerald-400">{formatINR(totalCredit)}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-rose-400" /><p className="text-xs text-slate-500">Total Debited</p></div><p className="text-xl font-bold text-rose-400">{formatINR(totalDebit)}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500 mb-1">Total Wallet Balance</p><p className="text-xl font-bold text-emerald-400">{formatINR(totalWalletBalance)}</p></Card>
        </div>
      )}

      {tab === 'ORDERS' && (
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'] as OrderFilter[]).map((f) => (
            <button key={f} onClick={() => { setOrderFilter(f); setPageOrders(1); }}
              className={'px-4 py-2 rounded-full text-sm font-medium border transition ' + (orderFilter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-600 hover:text-emerald-400')}>
              {f === 'ALL' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
      {tab === 'TOPUPS' && (
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as TopupFilter[]).map((f) => (
            <button key={f} onClick={() => { setTopupFilter(f); setPageTopups(1); }}
              className={'px-4 py-2 rounded-full text-sm font-medium border transition ' + (topupFilter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-600 hover:text-emerald-400')}>
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'ORDERS' ? 'Search orders...' : tab === 'TOPUPS' ? 'Search top-ups...' : 'Search transactions...'} className="pl-9" />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
          <Filter className="w-4 h-4" />
          {tab === 'ORDERS' ? filteredOrders.length : tab === 'TOPUPS' ? filteredTopups.length : filteredTxns.length} results
        </div>
      </div>

      <Card>
        {tab === 'ORDERS' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs bg-slate-950/50">
                  <tr><th className="text-left p-3">Order ID</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Service</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Date</th><th className="text-left p-3">Status</th><th className="text-right p-3">Action</th></tr>
                </thead>
                <tbody>
                  {pagedOrders.length === 0 ? <tr><td colSpan={7} className="text-center py-12"><Empty title="No orders found" /></td></tr>
                    : pagedOrders.map((o, idx) => (
                      <tr key={o.id + '-' + idx} className="border-t border-slate-800 hover:bg-slate-950/50">
                        <td className="p-3 font-mono text-xs text-slate-400">{o.id}</td>
                        <td className="p-3 text-slate-200">{o.customerName}</td>
                        <td className="p-3 text-slate-200">{o.serviceName}</td>
                        <td className="p-3 text-slate-200">{formatINR(o.amount)}</td>
                        <td className="p-3 text-slate-400 text-xs">{formatDate(o.createdAt)}</td>
                        <td className="p-3"><StatusBadge status={o.status} /></td>
                        <td className="p-3 text-right"><Link to={o.serviceId === 'pan-find' ? '/admin/pan-finds' : '/admin/orders/' + o.id} className="text-emerald-400 hover:underline text-xs">Manage</Link></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {filteredOrders.length > 0 && <Pagination total={filteredOrders.length} page={pageOrders} perPage={perPage} onPageChange={setPageOrders} onPerPageChange={setPerPage} />}
          </>
        )}

        {tab === 'TOPUPS' && (
          <>
            <ul className="divide-y divide-slate-800">
              {pagedTopups.length === 0 ? <Empty title="No top-up requests" />
                : pagedTopups.map((t, idx) => (
                  <li key={t.id + '-' + idx} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 font-medium">{t.userName} - {formatINR(t.amount)}</p>
                      <p className="text-xs text-slate-500 font-mono">UTR: {t.utr}</p>
                      <p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p>
                      {t.note && <p className="text-xs text-rose-400 mt-1">{t.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={t.status === 'APPROVED' ? 'green' : t.status === 'REJECTED' ? 'red' : 'yellow'}>{t.status}</Badge>
                      {t.status === 'PENDING' && (
                        <>
                          <Btn variant="primary" disabled={busy === t.id} onClick={() => approveTopup(t.id)}>Approve</Btn>
                          <Btn variant="danger" disabled={busy === t.id} onClick={() => rejectTopup(t.id)}>Reject</Btn>
                        </>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
            {filteredTopups.length > 0 && <Pagination total={filteredTopups.length} page={pageTopups} perPage={perPage} onPageChange={setPageTopups} onPerPageChange={setPerPage} />}
          </>
        )}

        {tab === 'WALLET' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs bg-slate-950/50">
                  <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Type</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Note</th><th className="text-right p-3">Balance</th></tr>
                </thead>
                <tbody>
                  {pagedTxns.length === 0 ? <tr><td colSpan={6} className="text-center py-12"><Empty title="No transactions found" /></td></tr>
                    : pagedTxns.map((t, i) => (
                      <tr key={t.id + i} className="border-t border-slate-800 hover:bg-slate-950/50">
                        <td className="p-3 text-slate-400 text-xs">{formatDate(t.createdAt)}</td>
                        <td className="p-3 text-slate-200">{t.customerName}</td>
                        <td className="p-3"><Badge tone={t.type === 'CREDIT' ? 'green' : 'red'}>{t.type}</Badge></td>
                        <td className={'p-3 font-medium ' + (t.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400')}>{t.type === 'CREDIT' ? '+' : '-'}{formatINR(t.amount)}</td>
                        <td className="p-3 text-slate-400 text-xs">{t.note}</td>
                        <td className="p-3 text-right text-slate-300">{formatINR(t.balanceAfter)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {filteredTxns.length > 0 && <Pagination total={filteredTxns.length} page={pageWallet} perPage={perPage} onPageChange={setPageWallet} onPerPageChange={setPerPage} />}
          </>
        )}
      </Card>

      <div className="text-sm text-slate-500 pl-1">
        <strong className="text-slate-300">{tab === 'ORDERS' ? filteredOrders.length : tab === 'TOPUPS' ? filteredTopups.length : filteredTxns.length}</strong> Total Entries
      </div>
    </div>
  );
}