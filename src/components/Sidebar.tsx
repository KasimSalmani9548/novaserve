import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Wallet, Bell, User, HelpCircle, LogOut, Users, Tags, Settings, X, ScanSearch, CheckCircle, Receipt, CreditCard, Tag } from 'lucide-react';
import { useAuth } from '../lib/store';

interface Item { to: string; label: string; icon: React.ElementType; }

const customerItems: Item[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/wallet', label: 'Wallet', icon: Wallet },
  { to: '/app/transactions', label: 'Transactions', icon: Receipt },
  { to: '/app/services', label: 'Services', icon: Package },
  { to: '/app/pan-find', label: 'PAN Find', icon: ScanSearch },
  { to: '/app/aadhaar-pvc', label: 'Aadhaar PVC', icon: CreditCard },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/support', label: 'Help & Support', icon: HelpCircle },
];

const adminItems: Item[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/manage', label: 'Manage Reports', icon: Receipt },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/services', label: 'Services', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/pan-finds', label: 'PAN Finds', icon: ScanSearch },
  { to: '/admin/aadhaar-pvc', label: 'Aadhaar PVC', icon: CreditCard },
  { to: '/admin/pricing', label: 'Payment Settings', icon: Tag },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/support', label: 'Support', icon: HelpCircle },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const items = user?.role === 'ADMIN' ? adminItems : customerItems;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="font-bold text-lg text-slate-100">NovaServe</h1>
            <p className="text-xs text-emerald-400 truncate">{user?.name || 'User'}</p>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-auto p-3 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <it.icon size={18} />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
