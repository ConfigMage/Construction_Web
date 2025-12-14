import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jones GC Tracker',
  description: 'Estimate & Invoice Tracker for Jones General Contracting LLC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
