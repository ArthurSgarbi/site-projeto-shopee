import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const themeScript = `(function(){try{var saved=localStorage.getItem('sync-mobile-theme');var dark=saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light'}catch(error){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'SYNC Mobile | Gestão da sua loja',
  description:
    'Controle estoque, pedidos, entregas, anúncios, reposições e lucro da sua loja em um só lugar.',
  icons: {
    icon: [{ url: '/sync-mobile-logo.jpeg', type: 'image/jpeg' }],
    apple: [{ url: '/sync-mobile-logo.jpeg', type: 'image/jpeg' }],
  },
  openGraph: {
    title: 'SYNC Mobile | Gestão da sua loja',
    description: 'Estoque, anúncios e lucro em sincronia.',
    type: 'website',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'SYNC Mobile — estoque, anúncios e lucro em sincronia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SYNC Mobile | Gestão da sua loja',
    description: 'Estoque, anúncios e lucro em sincronia.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
