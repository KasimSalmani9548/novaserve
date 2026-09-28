import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, formatDate } from '../../components/ui';
import { Pagination } from '../../components/Pagination';
import type { Notification } from '../../lib/types';

export function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const d = await api.get('/notifications');
        if (!cancelled) setItems(Array.isArray(d) ? d : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
      try { await api.post('/notifications/read'); } catch {}
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  const paged = items.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Notifications</h1>
        <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <Empty title="No notifications" subtitle="You are all caught up." />
      ) : (
        <div className="space-y-2">
          {paged.map((n) => (
            <Card key={n.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100">{n.title}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{n.message}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 mt-2">{formatDate(n.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <Pagination
          total={items.length}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      )}
    </div>
  );
}
