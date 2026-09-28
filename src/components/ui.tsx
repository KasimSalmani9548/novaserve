import React from 'react';
import { Loader2 } from 'lucide-react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-slate-900 border border-slate-800 rounded-xl ${className}`}>{children}</div>;
}
export function Btn({ children, onClick, variant = 'primary', type = 'button', disabled, className = '' }: any) {
  const styles: any = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}
export function Input(props: any) {
  return <input {...props} className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-600 ${props.className || ''}`} />;
}
export function Textarea(props: any) {
  return <textarea {...props} className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-600 ${props.className || ''}`} />;
}
export function Select(props: any) {
  return <select {...props} className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-600 ${props.className || ''}`} />;
}
export function Label({ children }: any) {
  return <label className="block text-xs font-medium text-slate-400 mb-1.5">{children}</label>;
}
export function Badge({ children, tone = 'slate' }: any) {
  const tones: any = {
    slate: 'bg-slate-800 text-slate-300', green: 'bg-emerald-900/50 text-emerald-400',
    yellow: 'bg-amber-900/50 text-amber-400', red: 'bg-red-900/50 text-red-400',
    blue: 'bg-blue-900/50 text-blue-400', purple: 'bg-purple-900/50 text-purple-400',
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
export function Spinner({ className = '' }: any) { return <Loader2 className={`animate-spin ${className}`} />; }
export function Empty({ title, subtitle }: any) {
  return <div className="text-center py-12"><p className="text-slate-400 font-medium">{title}</p>{subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}</div>;
}
export function Modal({ open, onClose, title, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
export const STATUS_TONE: any = { PENDING: 'yellow', PROCESSING: 'blue', DOCUMENT_REQUIRED: 'purple', COMPLETED: 'green', REJECTED: 'red', CANCELLED: 'slate' };
export function StatusBadge({ status }: any) { return <Badge tone={STATUS_TONE[status] || 'slate'}>{status.replace('_', ' ')}</Badge>; }
export function formatDate(iso: string) { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
export function formatINR(n: number) { return `Rs ${n.toLocaleString('en-IN')}`; }
