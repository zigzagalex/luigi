// next.config.js
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin(
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Monorepo / multiple lockfiles: keep Turbopack rooted on this app.
  turbopack: {
    root: __dirname,
  },
};

module.exports = withNextIntl(nextConfig);