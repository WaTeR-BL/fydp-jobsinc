import type React from 'react';
import type { Metadata } from 'next';
import '@/app/globals.css';
import LayoutWrapper from '@/app/wrapper';

export const metadata: Metadata = {
  title: 'Jobsinc.ai - AI-Powered Recruitment Platform',
  description:
    'From Job Discovery to Hiring Decisions — An End-to-End AI Recruitment Ecosystem. Revolutionizing recruitment with WhatsApp workflows and AI automation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
