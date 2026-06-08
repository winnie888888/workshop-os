import type { MetadataRoute } from 'next';

/**
 * Web app manifest (Next.js metadata route). This is what makes the app
 * installable as a full-screen PWA: when someone uses "Add to Home Screen", the
 * browser reads this to decide the app's name, icon, colours, and — crucially —
 * `display: standalone`, which launches it without browser chrome so it looks
 * and feels like a native app. Served at /manifest.webmanifest.
 *
 * Icons point at the PNGs in /public at the two sizes Android requires (192,
 * 512); the 512 is also `maskable` so Android crops it to the device icon shape
 * without clipping the mark. `shortcuts` add long-press quick actions on the
 * home-screen icon (Android / desktop PWAs).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'A-SPRINT Workshop OS',
    short_name: 'A-SPRINT',
    description: 'AI-native operating system for commercial-vehicle workshops',
    lang: 'sl',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#14181d',
    theme_color: '#14181d',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Nov delovni nalog', short_name: 'Nov nalog', url: '/advisor/work-orders/new' },
      { name: 'Stranke', short_name: 'Stranke', url: '/advisor/customers' },
      { name: 'Koledar', short_name: 'Koledar', url: '/advisor/calendar' },
    ],
  };
}
