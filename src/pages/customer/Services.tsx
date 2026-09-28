import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Input, Spinner, Empty } from '../../components/ui';
import { ServiceTile } from '../../components/ServiceTile';
import type { Category, Service } from '../../lib/types';

export function CustomerServices() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/services'), api.get('/categories')])
      .then(([s, c]) => { setServices(s); setCategories(c); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return services
      .filter((s) => s.active)
      .filter((s) => !cat || s.categoryId === cat)
      .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));
  }, [services, q, cat]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Services</h1>
        <p className="text-sm text-slate-500 mt-1">Choose a service to get started</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services..." className="pl-9" />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-600"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Empty title="No services found" subtitle="Try a different search or category." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((s) => (
            <ServiceTile
              key={s.id}
              service={s}
              onClick={() => {
                if (s.id === 'svc-pan-find') nav('/app/pan-find');
                else if (s.id === 'svc-aadhaar-pvc') nav('/app/aadhaar-pvc');
                else nav('/app/services/' + s.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
