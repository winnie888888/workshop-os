import type { Metadata, Viewport } from 'next';
import { Manrope, IBM_Plex_Mono } from 'next/font/google';
import './../styles/globals.css';
import { DemoBootstrap } from '@/components/demo-bootstrap';

/*
 * Type: Manrope as the clean, businesslike UI face (display + body), IBM Plex
 * Mono kept for plates/money/clocks where a tabular, mechanical feel is right.
 */
const display = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-display' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'A-SPRINT Workshop OS',
  description: 'AI-native operating system for commercial-vehicle workshops',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Workshop OS',
  },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
           { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0e63b3',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sl" className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-full font-body antialiased">
        <DemoBootstrap>{children}</DemoBootstrap>
      </body>
    </html>
  );
}
