'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Send, Clock, AlertCircle, CheckCircle2, UserCheck, Zap, Mail } from 'lucide-react';
import Papa from 'papaparse';
import { SenderAccount } from '../types';
import { apiService } from '../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  senders: SenderAccount[];
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  senders,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsInput, setRecipientsInput] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (senders.length > 0 && !selectedSender) {
      setSelectedSender(senders[0].email);
    }
  }, [senders, selectedSender]);

  useEffect(() => {
    // Parse recipients text area line by line or comma separated
    const rawList = recipientsInput.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const valid = Array.from(
      new Set(
        rawList
          .map((e) => e.toLowerCase())
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    );
    setParsedEmails(valid);
  }, [recipientsInput]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          const emails: string[] = [];
          results.data.forEach((row: any) => {
            if (Array.isArray(row)) {
              row.forEach((cell) => {
                if (typeof cell === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell.trim())) {
                  emails.push(cell.trim().toLowerCase());
                }
              });
            } else if (typeof row === 'object' && row !== null) {
              Object.values(row).forEach((cell: any) => {
                if (typeof cell === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell.trim())) {
                  emails.push(cell.trim().toLowerCase());
                }
              });
            }
          });

          const unique = Array.from(new Set(emails));
          if (unique.length > 0) {
            setRecipientsInput((prev) => (prev ? `${prev}\n${unique.join('\n')}` : unique.join('\n')));
            setError(null);
          } else {
            setError('No valid email addresses found in CSV file.');
          }
        },
      });
    } else {
      // Handle plain text file
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const extracted = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          const unique = Array.from(new Set(extracted.map((e) => e.toLowerCase())));
          if (unique.length > 0) {
            setRecipientsInput((prev) => (prev ? `${prev}\n${unique.join('\n')}` : unique.join('\n')));
            setError(null);
          } else {
            setError('No valid email addresses found in file.');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedEmails.length === 0) {
      setError('Please provide at least one valid recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setError('Email subject is required.');
      return;
    }

    if (!body.trim()) {
      setError('Email body content is required.');
      return;
    }

    setLoading(true);

    try {
      await apiService.scheduleEmailBatch({
        subject,
        body,
        recipients: parsedEmails,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        delaySeconds,
        hourlyLimit,
        senderEmail: selectedSender || senders[0]?.email || 'outreach@reachinbox-demo.ai',
      });

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Failed to schedule emails.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-base">Compose Cold Email Campaign</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-3 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Sender Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Select Sender Account</span>
              <span className="text-[11px] text-indigo-400">Multiple Senders Supported</span>
            </label>
            <select
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
            >
              {senders.length > 0 ? (
                senders.map((s) => (
                  <option key={s.id} value={s.email}>
                    {s.name} ({s.email}) — Max {s.maxEmailsPerHour}/hr
                  </option>
                ))
              ) : (
                <option value="outreach@reachinbox-demo.ai">outreach@reachinbox-demo.ai</option>
              )}
            </select>
          </div>

          {/* File Upload & Recipients */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Recipients ({parsedEmails.length} detected)
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV / TXT</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={3}
              value={recipientsInput}
              onChange={(e) => setRecipientsInput(e.target.value)}
              placeholder="Paste email addresses separated by commas or line breaks (or upload a CSV file above)..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500 placeholder-slate-500 font-mono"
            />
            {parsedEmails.length > 0 && (
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{parsedEmails.length} unique email addresses parsed and ready.</span>
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Transforming cold outreach with ReachInbox AI"
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Body Content
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{name}}, We saw your company growth and thought our AI email automation..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-3.5 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
            />
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
            {/* Start Time */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Start Schedule Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Default: Immediately</span>
            </div>

            {/* Inter-email Delay */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Delay Between Sends (sec)
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Min 2s throttling</span>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Hourly Limit (emails/hr)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 200)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Triggers Slack notification</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scheduling Jobs...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Schedule Email Batch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
