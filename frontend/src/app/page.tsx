'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, SenderAccount, ScheduledEmailItem, EmailStats, QueueJobCounts } from '../types';
import { apiService } from '../services/api';
import { Header } from '../components/Header';
import { LoginModal } from '../components/LoginModal';
import { ComposeModal } from '../components/ComposeModal';
import { ScheduledTable } from '../components/ScheduledTable';
import { SentTable } from '../components/SentTable';
import { SlackModal } from '../components/SlackModal';
import { QueueViewer } from '../components/QueueViewer';
import { StatsBar } from '../components/StatsBar';
import { Clock, MailCheck, Activity, Search, RefreshCw, Sparkles } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'queue'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  // Data states
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<ScheduledEmailItem[]>([]);
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [queue, setQueue] = useState<QueueJobCounts | null>(null);
  const [loading, setLoading] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScheduledEmailItem[] | null>(null);
  const [searchSource, setSearchSource] = useState<string>('');

  // Initial user setup or demo login check
  useEffect(() => {
    const savedUser = localStorage.getItem('reachinbox_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, sentRes, sendersRes, statsRes, slackRes] = await Promise.all([
        apiService.getScheduledEmails(),
        apiService.getSentEmails(),
        apiService.getSenders(),
        apiService.getEmailStats(),
        apiService.getSlackStatus(user?.email),
      ]);

      setScheduledEmails(schedRes.emails || []);
      setSentEmails(sentRes.emails || []);
      setSenders(sendersRes.senders || []);
      setStats(statsRes.stats || null);
      setQueue(statsRes.queue || null);
      setSlackConnected(slackRes.connected);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (user) {
      fetchData();
      // Auto-poll stats every 4 seconds to reflect BullMQ execution
      const interval = setInterval(fetchData, 4000);
      return () => clearInterval(interval);
    }
  }, [user, fetchData]);

  // Handle Elasticsearch Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiService.searchEmails(searchQuery);
        setSearchResults(res.emails);
        setSearchSource(res.source);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleGoogleLogin = async (loginPayload: any) => {
    try {
      const res = await apiService.googleLogin(loginPayload);
      setUser(res.user);
      localStorage.setItem('reachinbox_user', JSON.stringify(res.user));
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  const handleDemoLogin = async () => {
    try {
      const res = await apiService.googleLogin({
        email: 'alex.johnson@reachinbox.ai',
        name: 'Alex Johnson',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      });
      setUser(res.user);
      localStorage.setItem('reachinbox_user', JSON.stringify(res.user));
    } catch (err) {
      console.error('Demo login error:', err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('reachinbox_user');
  };

  if (!user) {
    return (
      <LoginModal
        onLoginSuccess={handleGoogleLogin}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlack={() => setIsSlackOpen(true)}
        onOpenQueue={() => setActiveTab('queue')}
        slackConnected={slackConnected}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Live Metrics Overview Bar */}
        <StatsBar stats={stats} queue={queue} />

        {/* Search Results Display Mode */}
        {searchResults !== null ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>Search Results for "{searchQuery}"</span>
                <span className="text-xs text-slate-400 font-mono">({searchResults.length} matches)</span>
              </h3>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300 font-mono border border-slate-700">
                Source: {searchSource}
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-2 text-slate-600 stroke-1" />
                <p className="text-sm">No emails matched your search term.</p>
              </div>
            ) : (
              <ScheduledTable
                emails={searchResults}
                loading={false}
                onRefresh={fetchData}
              />
            )}
          </div>
        ) : (
          <>
            {/* Dashboard Main Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition ${
                    activeTab === 'scheduled'
                      ? 'border-indigo-500 text-indigo-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Scheduled Emails</span>
                  <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                    {scheduledEmails.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('sent')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition ${
                    activeTab === 'sent'
                      ? 'border-emerald-500 text-emerald-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MailCheck className="w-4 h-4" />
                  <span>Sent Emails</span>
                  <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                    {sentEmails.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('queue')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition ${
                    activeTab === 'queue'
                      ? 'border-purple-500 text-purple-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>BullMQ Live Monitor</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Auto-refreshing queue telemetry</span>
              </div>
            </div>

            {/* Tab Views */}
            {activeTab === 'scheduled' && (
              <ScheduledTable
                emails={scheduledEmails}
                loading={loading}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'sent' && (
              <SentTable
                emails={sentEmails}
                loading={loading}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'queue' && <QueueViewer />}
          </>
        )}
      </main>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchData}
        senders={senders}
      />

      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        userEmail={user.email}
        onStatusChange={setSlackConnected}
      />
    </div>
  );
}
