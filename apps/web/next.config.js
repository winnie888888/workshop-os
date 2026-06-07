/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@workshop/shared'],
  // The browser talks to the NestJS API; the base URL is injected at build time.
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  },
};
module.exports = nextConfig;
