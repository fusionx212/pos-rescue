import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Rescue — Emergency QR Payments",
  description:
    "When your POS or internet goes down, generate a QR code and your customers pay on their own phones via Apple Pay or Google Pay.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
