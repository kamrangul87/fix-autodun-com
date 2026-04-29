import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'fix.autodun.com — AI Vehicle Fix Assistant for UK Drivers',
  description:
    'AI-powered breakdown assistant, warning light decoder, parking fine appeal generator and fair price checker for UK drivers.',
  metadataBase: new URL('https://fix.autodun.com'),
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'fix.autodun.com — AI Vehicle Fix Assistant for UK Drivers',
    description:
      'AI-powered breakdown assistant, warning light decoder, parking fine appeal generator and fair price checker for UK drivers.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="vercel-toolbar" content="false" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
