import type { Config } from 'tailwindcss';

// Design system: clean, business, Minimax-aligned (light surfaces, single blue
// brand accent, soft status pills), with touch-friendly targets retained for
// the shop floor. Older industrial token names are kept (remapped to the light
// palette) so screens not yet migrated keep working.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — A-SPRINT (temporary blue; swap these to lock the identity)
        brand: '#2563eb',
        brand600: '#1d4ed8',
        brand700: '#1e40af',
        brandweak: '#eef4ff',
        brandring: '#bfd3fb',

        // Sidebar (dark navy rail from the design spec)
        sidebar: '#0f2236',
        sidebar2: '#1c3653',
        sidebartext: '#9fb0c3',

        // Neutrals
        ink: '#1b2733',        // primary text
        steel: '#44515f',      // secondary text
        muted: '#6b7886',
        muted2: '#95a1ad',
        floor: '#f4f6f9',      // app background
        panel: '#ffffff',
        surface: '#ffffff',
        surface2: '#fafbfd',
        line: '#e4e9f0',
        linestrong: '#d3dae4',

        // Status (used as soft pills via /10 tint, and as solid fills)
        go: '#1c7a43',         // ok / ready / done
        hold: '#9a6412',       // waiting / warn
        stop: '#c3362b',       // alert / overdue
        info: '#2563eb',       // = brand (links / primary)
        safety: '#e0a400',     // accent (used sparingly)
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        base: ['0.9375rem', '1.45rem'],  // 15px
        tap: ['1rem', '1.5rem'],
      },
      minHeight: { tap: '3rem' },        // 48px touch floor (mixed office/floor)
      minWidth: { tap: '3rem' },
      borderRadius: { tool: '0.625rem', card: '1rem' },
      boxShadow: {
        tool: '0 1px 2px rgba(20,35,55,.06), 0 1px 1px rgba(20,35,55,.04)',
        card: '0 1px 2px rgba(20,35,55,.04), 0 6px 20px -4px rgba(20,35,55,.08)',
        lift: '0 10px 30px rgba(20,35,55,.14)',
      },
    },
  },
  plugins: [],
};
export default config;
