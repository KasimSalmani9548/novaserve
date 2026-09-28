import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, Btn, Badge } from '../../components/ui';
import type { Category } from '../../lib/types';

export function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);

  const load = () => api.get('/categories').then(setCats).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!name.trim()) return;
    if (editing) await api.put(`/categories/${editing.id}`, { name });
    else await api.post('/categories', { name });
    setName(''); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this category? Services in it will show as Uncategorized.')) return;
    await api.del(`/categories/${id}`); load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-100">Categories</h1>
      <Card className="p-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={editing ? 'Edit name' : 'New category name'} />
          <Btn onClick={save}>{editing ? 'Update' : 'Add'}</Btn>
          {editing && <Btn variant="secondary" onClick={() => { setEditing(null); setName(''); }}>Cancel</Btn>}
        </div>
      </Card>
      <Card>
        {cats.length === 0 ? <Empty title="No categories" /> : (
          <ul className="divide-y divide-slate-800">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-slate-200">{c.name}</span>
                  <Badge tone={c.active ? 'green' : 'slate'}>{c.active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="space-x-2">
                  <button onClick={() => { setEditing(c); setName(c.name); }} className="text-emerald-400 text-xs hover:underline">Edit</button>
                  <button onClick={() => del(c.id)} className="text-red-400 text-xs hover:underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
