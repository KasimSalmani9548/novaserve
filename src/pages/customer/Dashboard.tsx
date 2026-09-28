import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, StatusBadge, formatDate, formatINR } from '../../components/ui';
import type { Order, Service, Wallet } from '../../lib/types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

export function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/orders'), api.get('/services'), api.get('/wallet')])
      .then(([o, s, w]) => { setOrders(o); setServices(s); setWallet(w.wallet); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  const active = services.filter((s) => s.active).length;
  const pending = orders.filter((o) => ['PENDING', 'PROCESSING', 'DOCUMENT_REQUIRED'].includes(o.status)).length;
  const completed = orders.filter((o) => o.status === 'COMPLETED').length;

  const cards: { label: string; value: any; tone?: string }[] = [
    { label: 'Wallet Balance', value: formatINR(wallet?.balance || 0), tone: 'text-emerald-400' },
    { label: 'Available Services', value: active },
    { label: 'Total Orders', value: orders.length },
    { label: 'Pending Orders', value: pending, tone: 'text-amber-400' },
    { label: 'Completed Orders', value: completed, tone: 'text-emerald-400' },
  ];

  // Chart 1: Orders by status (Pie)
  const statusData = [
    { name: 'Pending', value: orders.filter((o) => o.status === 'PENDING').length, color: '#f59e0b' },
    { name: 'Processing', value: orders.filter((o) => o.status === 'PROCESSING').length, color: '#3b82f6' },
    { name: 'Completed', value: orders.filter((o) => o.status === 'COMPLETED').length, color: '#10b981' },
    { name: 'Rejected', value: orders.filter((o) => o.status === 'REJECTED').length, color: '#ef4444' },
    { name: 'Cancelled', value: orders.filter((o) => o.status === 'CANCELLED').length, color: '#64748b' },
  ].filter((d) => d.value > 0);

  // Chart 2: Last 7 days orders (Bar)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    return {
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      orders: orders.filter((o) => new Date(o.createdAt).toDateString() === dayStr).length,
      spent: orders
        .filter((o) => new Date(o.createdAt).toDateString() === dayStr)
        .reduce((s, o) => s + o.amount, 0),
    };
  });

  // Chart 3: Wallet balance over time (Line) — from transactions
  const recentTxns = orders.slice(0, 10).map((o, i) => ({
    name: '#' + (i + 1),
    amount: o.amount,
  })).reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.tone || 'text-slate-100'}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pie — Order Status */}
        <Card className="p-4">
          <h2 className="font-semibold text-slate-100 mb-4">Orders by Status</h2>
          {orders.length === 0 ? (
            <Empty title="No orders yet" />
          ) : (
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusData.map((entry, index) => (
                      <Cell key={'cell-' + index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    labelStyle={{ color: '#cbd5e1' }}
                  />
                  <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Bar — Last 7 days */}
        <Card className="p-4">
          <h2 className="font-semibold text-slate-100 mb-4">Last 7 Days Activity</h2>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Line — Recent order amounts */}
      {recentTxns.length > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold text-slate-100 mb-4">Recent Order Amounts</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={recentTxns}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Recent Orders */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-100">Recent Orders</h2>
          <Link to="/app/orders" className="text-sm text-emerald-400 hover:underline">View all</Link>
        </div>
        {orders.length === 0 ? (
          <Empty title="No orders yet" subtitle="Browse services to place your first order." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs">
                <tr>
                  <th className="text-left py-2">Order ID</th>
                  <th className="text-left py-2">Service</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="border-t border-slate-800">
                    <td className="py-2 font-mono text-xs text-slate-400">{o.id}</td>
                    <td className="py-2 text-slate-200">{o.serviceName}</td>
                    <td className="py-2 text-slate-200">{formatINR(o.amount)}</td>
                    <td className="py-2 text-slate-400 text-xs">{formatDate(o.createdAt)}</td>
                    <td className="py-2"><StatusBadge status={o.status} /></td>
                    <td className="py-2 text-right">
                      <Link to={o.serviceId === 'pan-find' || o.serviceId === 'svc-pan-find' ? '/app/pan-find' : o.serviceId === 'aadhaar-pvc' || o.serviceId === 'svc-aadhaar-pvc' ? '/app/aadhaar-pvc' : '/app/orders/' + o.id} className="text-emerald-400 hover:underline text-xs">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
