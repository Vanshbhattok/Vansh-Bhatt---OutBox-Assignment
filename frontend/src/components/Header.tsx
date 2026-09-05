'use client';

import React from 'react';
import { User } from '../types';
import { LogOut, Plus, Activity, Slack, Search, Mail, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  onOpenQueue: () => void;
  slackConnected: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenCompose,
  onOpenSlack,
  onOpenQueue,
  slackConnected,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-200">
                ReachInbox
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">AI Cold Email Scheduler</p>
          </div>
        </div>

        {/* Global Search Bar (Elasticsearch backed) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search emails by subject, recipient, body, or status..."
              className="w-full bg-slate-800/80 text-slate-100 text-xs pl-10 pr-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-500 transition"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Slack Integration Button */}
          <button
            onClick={onOpenSlack}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              slackConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Configure Slack Rate Limit Notifications"
          >
            <Slack className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Slack</span>
            {slackConnected && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* BullMQ Live Dashboard */}
          <button
            onClick={onOpenQueue}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-indigo-300 border border-slate-700 hover:bg-slate-700 transition"
            title="View Live BullMQ Queue Dashboard"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Live Queue</span>
          </button>

          {/* Primary Compose Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Email</span>
          </button>

          {/* User Profile Avatar */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover"
              />
              <div className="hidden lg:block text-left text-xs">
                <div className="font-medium text-slate-200 leading-tight">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate max-w-[120px]">{user.email}</div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
