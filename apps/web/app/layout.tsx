import "./globals.css";

export const metadata = {
  title: "ktb.clubmanager",
  description: "Open-source club management with integrated bookkeeping",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
