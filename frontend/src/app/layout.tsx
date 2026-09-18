import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tuluzov Engineering Demo',
  description: 'Headless WordPress and WooCommerce backend with a Next.js frontend.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
