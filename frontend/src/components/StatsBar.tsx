'use client';

import React from 'react';
import { EmailStats, QueueJobCounts } from '../types';
import { Clock, CheckCircle2, AlertTriangle, Cpu, Layers } from 'lucide-react';

interface StatsBarProps {
  stats: EmailStats | null;
  queue: QueueJobCounts | null;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, queue }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Scheduled */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Scheduled Jobs
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.scheduled ?? 0}
          </div>
          <span className="text-[10px] text-indigo-400 mt-0.5 block">
            {queue?.delayed ?? 0} delayed in queue
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Sent */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Emails Sent
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.sent ?? 0}
          </div>
          <span className="text-[10px] text-emerald-400 mt-0.5 block">
            Via Ethereal SMTP
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* Rate Limited */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Rate Limited
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.rateLimited ?? 0}
          </div>
          <span className="text-[10px] text-rose-400 mt-0.5 block">
            Auto-deferred to next hr
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Worker Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Worker Engine
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            {queue?.active ?? 0} <span className="text-xs text-slate-400 font-normal">active</span>
          </div>
          <span className="text-[10px] text-purple-400 mt-0.5 block">
            BullMQ + Redis Persistent
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <Cpu className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
