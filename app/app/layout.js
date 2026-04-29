import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'fix.autodun.com — Vehicle Fix Assistant Hub',
  description:
    'AI-powered vehicle breakdown diagnosis, warning light decoder, parking fine appeal writer, and fair price checker.',
  metadataBase: new URL('https://fix.autodun.com'),
  openGraph: {
    title: 'fix.autodun.com — Vehicle Fix Assistant Hub',
    description: 'Free AI tools to help you deal with any vehicle problem.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="vercel-toolbar" content="false" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
