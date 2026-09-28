import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../lib/store';

export function Layout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();
  const notifPath = user?.role === 'ADMIN' ? '/admin/notifications' : '/app/notifications';

  return (
    <div className="min-h-screen flex bg-slate-950">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <button onClick={() => setOpen(true)} className="text-slate-300"><Menu size={20} /></button>
          <span className="font-semibold">NovaServe</span>
          <button onClick={() => nav(notifPath)} className="text-slate-300"><Bell size={18} /></button>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
