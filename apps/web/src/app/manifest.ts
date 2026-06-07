import type { MetadataRoute } from 'next';

/**
 * Web app manifest (Next.js metadata route). This is what makes the demo
 * installable as a full-screen PWA: when someone uses "Add to Home Screen", the
 * browser reads this to decide the app's name, icon, colours, and — crucially —
 * `display: standalone`, which launches it without browser chrome so it looks
 * and feels like a native app. Served at /manifest.webmanifest.
 *
 * The icons point at the PNG files in /public (generated once and committed), at
 * the two sizes Android requires (192 and 512). The 512 icon is also marked
 * `maskable` so Android can crop it to the device's icon shape without clipping
 * the mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'A-SPRINT Workshop OS',
    short_name: 'Workshop OS',
    description: 'AI-native operating system for commercial-vehicle workshops',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#14181d',
    theme_color: '#14181d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
