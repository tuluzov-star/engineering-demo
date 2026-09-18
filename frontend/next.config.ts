import type { NextConfig } from 'next';

const publicWordPressUrl = new URL(
  process.env.NEXT_PUBLIC_WORDPRESS_URL ?? 'http://localhost:8080',
);

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: publicWordPressUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: publicWordPressUrl.hostname,
        port: publicWordPressUrl.port,
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
};

export default nextConfig;
