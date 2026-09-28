import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Spinner, Btn, Label, Textarea, Select, StatusBadge, formatDate, formatINR } from '../../components/ui';
import type { Order } from '../../lib/types';

const STATUSES = ['PENDING', 'PROCESSING', 'DOCUMENT_REQUIRED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

export function AdminOrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = () => api.get(`/orders/${id}`).then((d) => {
    setOrder(d.order); setDocs(d.documents); setStatus(d.order.status); setNote(d.order.adminNote || '');
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const saveStatus = async (refund: boolean) => {
    setBusy(true);
    try {
      await api.put(`/orders/${id}/status`, { status, note, refund });
      setConfirmOpen(false);
      await load();
    } finally { setBusy(false); }
  };

  const onSave = () => {
    if (status === 'REJECTED' && order?.status !== 'REJECTED') {
      setConfirmOpen(true);
      return;
    }
    saveStatus(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;
  if (!order) return <p className="text-slate-400">Order not found.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <button onClick={() => nav(-1)} className="text-sm text-slate-400 hover:text-slate-100">Back</button>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-100">{order.serviceName}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><p className="text-slate-500 text-xs">Order ID</p><p className="font-mono text-slate-300">{order.id}</p></div>
          <div><p className="text-slate-500 text-xs">Customer</p><p className="text-slate-300">{order.customerName}</p></div>
          <div><p className="text-slate-500 text-xs">Amount</p><p className="text-slate-300">{formatINR(order.amount)}</p></div>
          <div><p className="text-slate-500 text-xs">Created</p><p className="text-slate-300">{formatDate(order.createdAt)}</p></div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-100 mb-3">Update Status</h2>
        <div className="space-y-3">
          <div><Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <div><Label>Admin Note</Label><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <Btn onClick={onSave} disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</Btn>
        </div>
      </Card>

      {docs.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-slate-100 mb-3">Uploaded Documents</h2>
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

      <Card className="p-6">
        <h2 className="font-semibold text-slate-100 mb-3">Timeline</h2>
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

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800">
              <h3 className="font-semibold text-slate-100">Refund to Customer?</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-300">
                You are about to reject order <span className="font-mono text-slate-400">{order.id}</span>.
              </p>
              <p className="text-sm text-slate-300">
                Do you want to refund <span className="font-bold text-emerald-400">{formatINR(order.amount)}</span> to the customer's wallet?
              </p>
              <p className="text-xs text-slate-500">
                If you choose <strong className="text-slate-300">No Refund</strong>, the customer will be notified that the refund was not initiated and is not eligible.
              </p>
            </div>
            <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
              <Btn variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy}>Cancel</Btn>
              <Btn variant="danger" onClick={() => saveStatus(false)} disabled={busy} className="flex-1">
                No Refund - Reject Only
              </Btn>
              <Btn onClick={() => saveStatus(true)} disabled={busy} className="flex-1">
                Yes Refund - Reject & Credit
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
