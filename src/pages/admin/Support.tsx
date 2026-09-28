import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Badge, Btn, formatDate } from '../../components/ui';

export function AdminSupport() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/support').then(setTickets).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    await api.put(`/support/${id}`, { status });
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-100">Support Requests</h1>
      {tickets.length === 0 ? <Empty title="No support requests" /> : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-slate-100">{t.subject}</p>
                <Badge tone={t.status === 'OPEN' ? 'yellow' : t.status === 'RESOLVED' ? 'green' : 'slate'}>{t.status}</Badge>
              </div>
              <p className="text-sm text-slate-400">{t.message}</p>
              <p className="text-xs text-slate-500 mt-1">{t.userName} - {formatDate(t.createdAt)}{t.orderId ? ' - Order ' + t.orderId : ''}</p>
              <div className="flex gap-2 mt-3">
                <Btn variant="secondary" onClick={() => update(t.id, 'RESOLVED')}>Mark Resolved</Btn>
                <Btn variant="ghost" onClick={() => update(t.id, 'CLOSED')}>Close</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
