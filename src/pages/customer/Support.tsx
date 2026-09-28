import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Btn, Input, Label, Textarea, Spinner, Empty, Badge, formatDate } from '../../components/ui';
import type { SupportTicket } from '../../lib/types';

const FAQ = [
  { q: 'How do I place an order?', a: 'Go to Services, pick a service, click Apply, fill the form, and confirm. The amount is deducted from your wallet.' },
  { q: 'How do I add money to my wallet?', a: 'Contact support or an admin to credit your wallet. Wallet top-ups are handled manually in this build.' },
  { q: 'What file types are supported for uploads?', a: 'PDF, JPG, JPEG, and PNG up to 5 MB per file.' },
  { q: 'How long does an order take?', a: 'Processing time depends on the service. Track your order status under My Orders.' },
];

export function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', message: '', orderId: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/support').then(setTickets).finally(() => setLoading(false)); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/support', form);
    setForm({ subject: '', message: '', orderId: '' });
    setMsg('Request submitted');
    const t = await api.get('/support');
    setTickets(t);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-slate-100">Help & Support</h1>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-100 mb-3">FAQ</h2>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <details key={i}>
              <summary className="cursor-pointer text-sm font-medium text-slate-200 hover:text-emerald-400">{f.q}</summary>
              <p className="text-sm text-slate-400 mt-2 pl-4">{f.a}</p>
            </details>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-100 mb-3">Submit a Support Request</h2>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
          <div><Label>Order ID (optional)</Label><Input value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></div>
          {msg && <p className="text-emerald-400 text-sm">{msg}</p>}
          <Btn type="submit">Submit</Btn>
        </form>
      </Card>

      <Card>
        <div className="p-4 border-b border-slate-800"><h2 className="font-semibold text-slate-100">My Requests</h2></div>
        {loading ? <div className="p-6 flex justify-center"><Spinner className="text-emerald-500" /></div>
          : tickets.length === 0 ? <Empty title="No support requests yet" />
          : (
            <ul className="divide-y divide-slate-800">
              {tickets.map((t) => (
                <li key={t.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-slate-100">{t.subject}</p>
                    <Badge tone={t.status === 'OPEN' ? 'yellow' : 'green'}>{t.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-400">{t.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatDate(t.createdAt)}{t.orderId ? ' - Order ' + t.orderId : ''}</p>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </div>
  );
}
