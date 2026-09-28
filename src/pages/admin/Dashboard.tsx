import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Spinner, StatusBadge, formatDate, formatINR } from '../../components/ui';
import type { Order } from '../../lib/types';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/stats'), api.get('/orders'), api.get('/customers')])
      .then(([s, o, c]) => { setStats(s); setOrders(o); setCustomers(c); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  const cards: { label: string; value: any; tone?: string }[] = [
    { label: 'Total Customers', value: stats.totalCustomers },
    { label: 'Active Services', value: stats.activeServices },
    { label: 'Total Orders', value: stats.totalOrders },
    { label: 'Pending Orders', value: stats.pendingOrders, tone: 'text-amber-400' },
    { label: 'Completed Orders', value: stats.completedOrders, tone: 'text-emerald-400' },
    { label: "Today's Orders", value: stats.todayOrders },
    { label: 'Total Revenue', value: formatINR(stats.totalRevenue), tone: 'text-emerald-400' },
    { label: 'Pending Support', value: stats.pendingSupport, tone: 'text-amber-400' },
  ];

  // Pie: Order Status Distribution
  const statusData = [
    { name: 'Pending', value: orders.filter((o) => o.status === 'PENDING').length, color: '#f59e0b' },
    { name: 'Processing', value: orders.filter((o) => o.status === 'PROCESSING').length, color: '#3b82f6' },
    { name: 'Completed', value: orders.filter((o) => o.status === 'COMPLETED').length, color: '#10b981' },
    { name: 'Rejected', value: orders.filter((o) => o.status === 'REJECTED').length, color: '#ef4444' },
    { name: 'Cancelled', value: orders.filter((o) => o.status === 'CANCELLED').length, color: '#64748b' },
  ].filter((d) => d.value > 0);

  // Bar: Last 7 days revenue
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const dayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === dayStr);
    return {
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      orders: dayOrders.length,
      revenue: dayOrders
        .filter((o) => ['PROCESSING', 'COMPLETED'].includes(o.status))
        .reduce((s, o) => s + o.amount, 0),
    };
  });

  // Line: Top services by order count
  const serviceCount: Record<string, number> = {};
  orders.forEach((o) => {
    serviceCount[o.serviceName] = (serviceCount[o.serviceName] || 0) + 1;
  });
  const topServices = Object.entries(serviceCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.tone || 'text-slate-100'}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pie — Order Status */}
        <Card className="p-4">
          <h2 className="font-semibold text-slate-100 mb-4">Order Status Distribution</h2>
          {statusData.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">No orders yet</p>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
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

        {/* Bar — Last 7 days revenue */}
        <Card className="p-4">
          <h2 className="font-semibold text-slate-100 mb-4">Revenue — Last 7 Days</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      {topServices.length > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold text-slate-100 mb-4">Top 5 Services by Order Count</h2>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={topServices} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={140} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Recent Orders + Recent Customers */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-100">Recent Orders</h2>
            <Link to="/admin/manage" className="text-sm text-emerald-400 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0 px-2">
                <div>
                  <p className="text-sm text-slate-200">{o.serviceName}</p>
                  <p className="text-xs text-slate-500">{o.customerName} - {formatDate(o.createdAt)}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
            {orders.length === 0 && <p className="text-slate-500 text-sm">No orders yet.</p>}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-100">Recent Customers</h2>
            <Link to="/admin/customers" className="text-sm text-emerald-400 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {customers.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0 px-2">
                <div>
                  <p className="text-sm text-slate-200">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.email}</p>
                </div>
                <span className="text-xs text-slate-400">{c.orderCount} orders</span>
              </div>
            ))}
            {customers.length === 0 && <p className="text-slate-500 text-sm">No customers yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
