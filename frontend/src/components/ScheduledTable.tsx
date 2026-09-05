'use client';

import React from 'react';
import { ScheduledEmailItem } from '../types';
import { Clock, AlertTriangle, RefreshCw, Inbox, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduledTableProps {
  emails: ScheduledEmailItem[];
  loading: boolean;
  onRefresh: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({ emails, loading, onRefresh }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Action Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
        <div>
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Scheduled & Delayed Email Queue</span>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {emails.length} Jobs
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            BullMQ persistent delayed jobs backed by Redis and PostgreSQL. No cron required.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-50"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Table Body */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Fetching scheduled BullMQ jobs...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="p-16 text-center text-slate-500">
          <Inbox className="w-12 h-12 stroke-1 mx-auto mb-3 text-slate-600" />
          <h4 className="text-slate-300 text-sm font-medium">No Scheduled Emails</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click "Compose Email" to schedule an email campaign using fake Ethereal SMTP.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/70 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Recipient</th>
                <th className="px-6 py-3.5">Subject & Content</th>
                <th className="px-6 py-3.5">Sender</th>
                <th className="px-6 py-3.5">Scheduled Delivery</th>
                <th className="px-6 py-3.5 text-right">Queue Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {emails.map((email) => {
                let statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Scheduled
                  </span>
                );

                if (email.status === 'PROCESSING') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Sending...
                    </span>
                  );
                } else if (email.status === 'RATE_LIMITED') {
                  statusBadge = (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      title="Hourly limit reached. Job auto-rescheduled to next hour window."
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Rate Limited (Next Window)
                    </span>
                  );
                }

                return (
                  <tr key={email.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 font-bold text-[10px]">
                          {email.recipient[0].toUpperCase()}
                        </div>
                        <span className="truncate max-w-[180px] font-mono">{email.recipient}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-medium text-slate-100 truncate">{email.subject}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 max-w-sm">
                        {email.body.replace(/<[^>]*>?/gm, '')}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                      {email.senderEmail}
                    </td>

                    <td className="px-6 py-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{format(new Date(email.scheduledAt), 'MMM dd, yyyy HH:mm:ss')}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">{statusBadge}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
