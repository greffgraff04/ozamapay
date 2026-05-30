import { Space_Grotesk } from 'next/font/google';
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

export const metadata = {
  title: "OZAMAPAY - Fintech Haiti",
  description: "Financial operating system for Haiti and the diaspora. Fast, secure, and borderless payments.",
  icons: {
    icon: "/incon.png",
    apple: "/incon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "OZAMAPAY",
    description: "Financial operating system for Haiti and the diaspora",
    url: "https://ozamapay.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={spaceGrotesk.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f1419" />
      </head>
      <body className="antialiased font-space-grotesk bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {children}
      </body>
    </html>
  );
}