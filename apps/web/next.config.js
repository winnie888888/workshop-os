/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The browser consumes @workshop/shared as ESM SOURCE (package "default" export
  // condition -> ./src), so Next must transpile it. The API uses the "require"
  // condition -> ./dist (CommonJS). Build shared once: pnpm --filter @workshop/shared build.
  transpilePackages: ['@workshop/shared'],
  // The browser talks to the NestJS API; the base URL is injected at build time.
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  },
};
module.exports = nextConfig;
