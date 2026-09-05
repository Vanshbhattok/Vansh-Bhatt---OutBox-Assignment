'use client';

import React, { useState, useEffect } from 'react';
import { X, Slack, CheckCircle2, AlertCircle, Send, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { apiService } from '../services/api';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onStatusChange: (connected: boolean) => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onStatusChange,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen, userEmail]);

  const checkStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await apiService.getSlackStatus(userEmail);
      setIsConnected(status.connected);
      onStatusChange(status.connected);
    } catch (err) {
      console.error('Failed to check Slack status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      setError('Please provide a valid Slack Incoming Webhook URL.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiService.connectSlack({
        webhookUrl,
        userEmail,
      });

      setSuccessMsg(res.message);
      setIsConnected(true);
      onStatusChange(true);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Failed to connect Slack webhook.');
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await apiService.disconnectSlack(userEmail);
      setIsConnected(false);
      onStatusChange(false);
      setWebhookUrl('');
      setSuccessMsg('Slack disconnected safely.');
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError('Failed to disconnect Slack.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Slack className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Connect Slack Notifications</h3>
              <p className="text-[11px] text-slate-400">Live rate-limit breach alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Connected Badge Info */}
          {isConnected && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-emerald-300">Slack Connected & Active</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live alerts will automatically post to Slack when sender limits are hit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition"
                title="Disconnect Slack"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Slack Incoming Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-pink-500 font-mono placeholder-slate-500"
              />
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Enter your Slack channel's Incoming Webhook URL. Upon connecting, ReachInbox will send a live verification message immediately!
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-purple-500 transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Connecting Slack...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Connect & Test Slack</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
