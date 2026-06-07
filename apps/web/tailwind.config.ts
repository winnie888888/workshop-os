import type { Config } from 'tailwindcss';

// Industrial / utilitarian aesthetic per the UX specs: heavy, high-contrast,
// legible under floodlight and sun, sized for gloved fingers. These tokens are
// the shared vocabulary the three interfaces draw from.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14181d',        // near-black primary text/surfaces
        steel: '#2b333d',      // secondary dark
        floor: '#f4f5f2',      // light shop-floor background
        panel: '#ffffff',
        line: '#d9dcd6',       // hairline borders
        // Strong, sun-legible status colours (blocks, not thin text)
        go: '#1f9d57',         // running / ok / ready
        hold: '#e08a00',       // on hold / waiting / warn
        stop: '#c3362b',       // alert / overdue / error
        info: '#2563aa',       // neutral info / links
        safety: '#ffb000',     // safety-yellow accent (A-SPRINT energy)
      },
      fontFamily: {
        // Distinctive, characterful pairing (loaded via next/font in layout):
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        // Larger base than typical web; arm's-length reading on propped devices.
        base: ['1.0625rem', '1.5rem'],
        tap: ['1.25rem', '1.6rem'],
      },
      minHeight: {
        // Gloved-finger touch target floor.
        tap: '3.5rem',
      },
      minWidth: { tap: '3.5rem' },
      borderRadius: { tool: '0.625rem' },
      boxShadow: {
        tool: '0 1px 0 0 #00000010, 0 2px 8px -2px #00000020',
        lift: '0 8px 24px -8px #00000035',
      },
    },
  },
  plugins: [],
};
export default config;
