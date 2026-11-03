import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexora CRM",
  description: "Nexora CRM for people, talent, and growth.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
