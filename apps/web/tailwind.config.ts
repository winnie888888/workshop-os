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
        // Brand — A-SPRINT (zaklenjena identiteta po potrjenem mockupu, jun 2026)
        brand: '#1A6BEF',
        brand600: '#1257C9',
        brand700: '#0F49AA',
        brandweak: '#EAF1FD',
        brandring: '#BBD3FB',

        // Sidebar (dark navy rail from the design spec)
        sidebar: '#0A1F3D',
        sidebar2: '#0E2950',
        sidebartext: '#9DB6D8',

        // Neutrals
        ink: '#0F1B2D',        // primary text
        steel: '#4A5A75',      // secondary text
        muted: '#5B6B82',
        muted2: '#8A99AE',
        floor: '#F2F5FA',      // app background
        panel: '#ffffff',
        surface: '#ffffff',
        surface2: '#F8FAFD',
        line: '#E3E9F2',
        linestrong: '#D2DCEA',

        // Status (used as soft pills via /10 tint, and as solid fills)
        go: '#178A47',         // ok / ready / done
        hold: '#B45309',       // waiting / warn
        stop: '#DC2626',       // alert / overdue
        info: '#1A6BEF',       // = brand (links / primary)
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
