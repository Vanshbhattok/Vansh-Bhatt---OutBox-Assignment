'use client';

import React from 'react';
import { ScheduledEmailItem } from '../types';
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, MailCheck, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface SentTableProps {
  emails: ScheduledEmailItem[];
  loading: boolean;
  onRefresh: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({ emails, loading, onRefresh }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
        <div>
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <MailCheck className="w-4 h-4 text-emerald-400" />
            <span>Sent & Delivered Email Log</span>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {emails.length} Sent
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Emails dispatched via Ethereal Fake SMTP with live clickable message preview links.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-50"
          title="Refresh Log"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Fetching sent email history...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="p-16 text-center text-slate-500">
          <MailCheck className="w-12 h-12 stroke-1 mx-auto mb-3 text-slate-600" />
          <h4 className="text-slate-300 text-sm font-medium">No Sent Emails Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Once BullMQ processes scheduled delayed jobs, sent email logs will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/70 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Recipient</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Sender Email</th>
                <th className="px-6 py-3.5">Sent Timestamp</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Ethereal Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {emails.map((email) => {
                const isSent = email.status === 'SENT';

                return (
                  <tr key={email.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isSent
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/10 border border-red-500/20 text-red-400'
                          }`}
                        >
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
                        <span>
                          {email.sentAt
                            ? format(new Date(email.sentAt), 'MMM dd, yyyy HH:mm:ss')
                            : format(new Date(email.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Sent
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20"
                          title={email.errorMessage || 'Failed'}
                        >
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {email.etherealPreviewUrl ? (
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition"
                        >
                          <span>View Email</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500 text-[11px]">N/A</span>
                      )}
                    </td>
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
