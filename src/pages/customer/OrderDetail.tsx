import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Spinner, StatusBadge, formatDate, formatINR } from '../../components/ui';
import type { Order } from '../../lib/types';

export function OrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`).then((d) => { setOrder(d.order); setDocs(d.documents); }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;
  if (!order) return <p className="text-slate-400">Order not found.</p>;

  const isRejected = order.status === 'REJECTED';
  const wasRefunded = isRejected && (order as any).refunded === true;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => nav(-1)} className="text-sm text-slate-400 hover:text-slate-100">Back</button>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-100">{order.serviceName}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-slate-500 text-xs">Order ID</p><p className="font-mono text-slate-300">{order.id}</p></div>
          <div><p className="text-slate-500 text-xs">Amount</p><p className="text-slate-300">{formatINR(order.amount)}</p></div>
          <div><p className="text-slate-500 text-xs">Created</p><p className="text-slate-300">{formatDate(order.createdAt)}</p></div>
          <div><p className="text-slate-500 text-xs">Updated</p><p className="text-slate-300">{formatDate(order.updatedAt)}</p></div>
        </div>
      </Card>

      {isRejected && (
        <Card className={`p-5 border-2 ${wasRefunded ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${wasRefunded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {wasRefunded ? 'OK' : '!'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold mb-1">
                Refund Status: {wasRefunded ? <span className="text-emerald-400">Refunded</span> : <span className="text-rose-400">Not Initiated</span>}
              </p>
              {wasRefunded ? (
                <p className="text-sm text-emerald-300">
                  Rs {order.amount} has been successfully refunded to your wallet.
                </p>
              ) : (
                <p className="text-sm text-rose-300">
                  Your service has been successfully completed. Therefore, the amount is <strong>not eligible for a refund</strong>.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-semibold text-slate-100 mb-3">Status Timeline</h2>
        <ol className="space-y-3">
          {order.timeline.map((t, i) => (
            <li key={i} className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
              <div>
                <p className="text-sm font-medium text-slate-200">{t.status.replace('_', ' ')}</p>
                <p className="text-xs text-slate-500">{formatDate(t.at)}{t.note ? ' - ' + t.note : ''}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {docs.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-slate-100 mb-3">Documents</h2>
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg text-sm">
                <span className="text-slate-300">{d.name} <span className="text-slate-500">({(d.size / 1024).toFixed(1)} KB)</span></span>
                <a href={d.data} download={d.name} className="text-emerald-400 text-xs hover:underline">Download</a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {order.adminNote && (
        <Card className="p-6">
          <h2 className="font-semibold text-slate-100 mb-2">Admin Note</h2>
          <p className="text-sm text-slate-300">{order.adminNote}</p>
        </Card>
      )}
    </div>
  );
}
