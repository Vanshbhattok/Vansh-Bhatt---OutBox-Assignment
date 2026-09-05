'use client';

import React from 'react';
import { ExternalLink, RefreshCw, Activity } from 'lucide-react';

export const QueueViewer: React.FC = () => {
  const queueUrl = process.env.NEXT_PUBLIC_BULL_BOARD_URL || 'http://localhost:5001/admin/queues';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[700px]">
      {/* Control Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Live BullMQ Queue Monitor</h3>
            <p className="text-xs text-slate-400">Real-time Redis job states, delayed counts, and worker telemetry</p>
          </div>
        </div>

        <a
          href={queueUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition"
        >
          <span>Open Full Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Embedded Iframe */}
      <div className="flex-1 bg-slate-950">
        <iframe
          src={queueUrl}
          title="BullMQ Dashboard"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};
