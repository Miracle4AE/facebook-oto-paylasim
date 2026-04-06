import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "Facebook Otomatik Paylaşım Paneli",
    template: "%s · Facebook Otomatik Paylaşım",
  },
  description: "İçeriklerinizi Facebook hedeflerinize zamanlayarak otomatik paylaşın.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
