export const metadata = {
  title: "Stock Ledger — Hebbarz Bionaturale",
  description: "Material inventory tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
