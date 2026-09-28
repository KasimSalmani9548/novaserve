import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, Label, Textarea, Select, Btn, Badge, Modal, formatINR } from '../../components/ui';
import type { Category } from '../../lib/types';

const empty = { name: '', description: '', categoryId: '', price: 0, icon: 'FileText', color: 'emerald', active: true, requiresDocuments: false, documentHint: '' };

const COLORS = ['emerald', 'blue', 'purple', 'amber', 'rose', 'cyan', 'indigo', 'teal'];

const ICONS = ['FileText', 'CreditCard', 'Building', 'FileEdit', 'Printer', 'Camera', 'User', 'Search', 'Shield', 'FileCheck', 'Receipt', 'IdCard'];

export function AdminServices() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [q, setQ] = useState('');

  const load = () => Promise.all([api.get('/services'), api.get('/categories')])
    .then(([s, c]) => { setServices(s); setCategories(c); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing.id) await api.put(`/services/${editing.id}`, editing);
    else await api.post('/services', editing);
    setEditing(null); load();
  };
  const restoreSystem = async () => {
    try {
      const res = await api.post('/services/restore-system');
      if (res.restored && res.restored.length > 0) {
        alert('Restored: ' + res.restored.join(', '));
      } else {
        alert('All system services already exist');
      }
      load();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    await api.del(`/services/${id}`); load();
  };

  const filtered = services.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><Spinner className="text-emerald-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Services</h1>
                <div className="flex gap-2">
          <Btn variant="secondary" onClick={restoreSystem}>Restore System Services</Btn>
          <Btn onClick={() => setEditing({ ...empty, categoryId: categories[0]?.id || '' })}>+ Add Service</Btn>
        </div>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services..." />

      <Card>
        {filtered.length === 0 ? <Empty title="No services" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs bg-slate-950/50">
                <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Category</th><th className="text-left p-3">Price</th><th className="text-left p-3">Status</th><th className="text-right p-3">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-slate-800">
                    <td className="p-3 text-slate-200">{s.name}</td>
                    <td className="p-3 text-slate-400 text-xs">{categories.find((c) => c.id === s.categoryId)?.name || '-'}</td>
                    <td className="p-3 text-emerald-400">{formatINR(s.price)}</td>
                    <td className="p-3"><Badge tone={s.active ? 'green' : 'slate'}>{s.active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => setEditing(s)} className="text-emerald-400 text-xs hover:underline">Edit</button>
                      <button onClick={() => del(s.id)} className="text-red-400 text-xs hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Service' : 'Add Service'}>
        {editing && (
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div><Label>Category</Label>
              <Select value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div><Label>Price (Rs)</Label><Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>

            <div>
              <Label>Tile Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditing({ ...editing, color: c })}
                    className={`w-10 h-10 rounded-lg border-2 ${editing.color === c ? 'border-emerald-500' : 'border-slate-700'}`}
                    style={{
                      backgroundColor: c === 'emerald' ? '#10b981' : c === 'blue' ? '#3b82f6' : c === 'purple' ? '#a855f7' :
                        c === 'amber' ? '#f59e0b' : c === 'rose' ? '#f43f5e' : c === 'cyan' ? '#06b6d4' :
                        c === 'indigo' ? '#6366f1' : '#14b8a6',
                      opacity: 0.6,
                    }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Icon</Label>
              <Select value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })}>
                {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={editing.requiresDocuments} onChange={(e) => setEditing({ ...editing, requiresDocuments: e.target.checked })} /> Requires Documents
              </label>
            </div>
            {editing.requiresDocuments && <div><Label>Document Hint</Label><Input value={editing.documentHint || ''} onChange={(e) => setEditing({ ...editing, documentHint: e.target.value })} placeholder="e.g. Aadhaar + PAN" /></div>}

            <div className="flex gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn onClick={save} className="flex-1">Save</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
