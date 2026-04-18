import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Socialize - Business Dashboard",
  description: "Manage your venue with Socialize",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${beVietnam.variable}`}>
      <body className="min-h-screen flex">
        <Sidebar />
        <main className="ml-64 flex-1 flex flex-col min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
