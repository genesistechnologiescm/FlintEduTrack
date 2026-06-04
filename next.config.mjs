/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this app (avoids the multi-lockfile warning).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
