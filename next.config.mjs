/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Photos are sent to a server action as a small cropped data URL (< 300 KB).
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
