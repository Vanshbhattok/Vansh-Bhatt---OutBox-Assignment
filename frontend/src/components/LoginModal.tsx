'use client';

import React from 'react';
import { Mail, Sparkles, Shield, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

interface LoginModalProps {
  onLoginSuccess: (user: any) => void;
  onDemoLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onDemoLogin }) => {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const hasValidGoogleClient = Boolean(googleClientId && googleClientId.includes('.apps.googleusercontent.com'));

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (credentialResponse.credential) {
        onLoginSuccess({ credential: credentialResponse.credential });
      }
    } catch (err) {
      console.error('Google login error:', err);
    }
  };

  const handleCustomGoogleClick = () => {
    onLoginSuccess({
      email: 'user@reachinbox-demo.ai',
      name: 'ReachInbox Workspace User',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    });
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
            {hasValidGoogleClient ? (
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
            ) : (
              <button
                onClick={handleCustomGoogleClick}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium text-sm bg-white text-slate-900 hover:bg-slate-100 transition group shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}

            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-xs text-slate-500 uppercase font-mono">OR</span>
            </div>

            {/* Quick Demo Login Option */}
            <button
              onClick={onDemoLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition group"
            >
              <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition transform" />
              <span>Continue with Demo Workspace</span>
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition transform" />
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
