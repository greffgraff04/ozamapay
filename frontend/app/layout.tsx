import "./globals.css";

export const metadata = {
  title: "Ozama Pay - Fintech",
  description: "Experience Ozama Pay Financial Infrastructure",
  icons: {
    icon: "/incon.png",   // <--- Mwen korije l isit la
    apple: "/incon.png",  // <--- Mwen korije l isit la
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}