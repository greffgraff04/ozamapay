import "./globals.css";

export const metadata = {
  title: "Ozama Pay - Fintech",
  description: "Experience Ozama Pay Financial Infrastructure",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}