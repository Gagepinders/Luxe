import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luxe Landscape & Snow — CRM",
  description:
    "All-in-one CRM for Luxe Landscape & Snow: customers, properties, quotes, jobs, routing and KPIs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-background">
        <Sidebar />
        <div className="flex-1 md:pl-60 pb-16 md:pb-0">{children}</div>
        <MobileNav />
      </body>
    </html>
  );
}
