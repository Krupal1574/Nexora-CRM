import type { Metadata } from "next";
import { CrmProviders } from "@/components/crm-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexora CRM",
  description: "Nexora CRM — People, Talent, Growth.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CrmProviders>{children}</CrmProviders>
      </body>
    </html>
  );
}
