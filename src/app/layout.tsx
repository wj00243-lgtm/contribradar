import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContribRadar",
  description: "Contribution intelligence for GitHub repositories"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
