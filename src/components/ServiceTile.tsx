import React from 'react';
import * as Icons from 'lucide-react';
import type { Service } from '../lib/types';

const TILE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400' },
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    icon: 'text-blue-400' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  icon: 'text-purple-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: 'text-amber-400' },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    icon: 'text-rose-400' },
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    icon: 'text-cyan-400' },
  indigo:  { bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  icon: 'text-indigo-400' },
  teal:    { bg: 'bg-teal-500/10',    border: 'border-teal-500/30',    icon: 'text-teal-400' },
};

function TileIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (Icons as any)[name] || Icons.FileText;
  return <Icon className={className} />;
}

export function ServiceTile({ service, onClick }: { service: Service & { color?: string; icon?: string }; onClick: () => void }) {
  const color = TILE_COLORS[service.color || 'emerald'] || TILE_COLORS.emerald;
  return (
    <button
      onClick={onClick}
      className={`group text-left p-5 rounded-xl border ${color.border} ${color.bg} hover:scale-[1.02] hover:shadow-lg transition-all duration-200 flex flex-col gap-3`}
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-slate-900/50 ${color.icon}`}>
        <TileIcon name={service.icon || 'FileText'} className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-100 text-sm leading-tight mb-1">{service.name}</h3>
        <p className="text-xs text-slate-400 line-clamp-2">{service.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-base font-bold text-emerald-400">Rs {service.price}</span>
        <span className="text-xs text-slate-500 group-hover:text-emerald-400 transition">Apply →</span>
      </div>
    </button>
  );
}
