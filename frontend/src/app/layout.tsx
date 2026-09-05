'use client';

import './globals.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1234567890-demo.apps.googleusercontent.com';

  return (
    <html lang="en" className="dark">
      <head>
        <title>ReachInbox.ai - Full-Stack Email Job Scheduler</title>
        <meta name="description" content="Production-Grade Email Scheduler with BullMQ, Redis, PostgreSQL, and Ethereal SMTP" />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <GoogleOAuthProvider clientId={googleClientId}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
