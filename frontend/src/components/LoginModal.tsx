'use client';

import React from 'react';
import { Mail, Sparkles, Shield, Lock, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

interface LoginModalProps {
  onLoginSuccess: (user: any) => void;
  onDemoLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onDemoLogin }) => {
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (credentialResponse.credential) {
        onLoginSuccess({ credential: credentialResponse.credential });
      }
    } catch (err) {
      console.error('Google login error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glowing background highlights */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative text-center">
          {/* Logo Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6">
            <Mail className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">ReachInbox</span>
          </h2>
          <p className="text-sm text-slate-400 mt-2 mb-8 leading-relaxed">
            AI-driven, persistent email job scheduler with real-time rate limiting and queue analytics.
          </p>

          <div className="space-y-4">
            {/* Google OAuth Login Button */}
            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => console.log('Login Failed')}
                theme="filled_blue"
                shape="pill"
                size="large"
                width="320"
              />
            </div>

            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-xs text-slate-500 uppercase font-mono">OR</span>
            </div>

            {/* Quick Demo Login Option */}
            <button
              onClick={onDemoLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-slate-800 to-slate-800/80 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-slate-700/50 transition group shadow-md"
            >
              <Sparkles className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition transform" />
              <span>Continue with Demo Workspace</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition transform" />
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>BullMQ Queue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Ethereal SMTP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
