import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Commons", template: "%s · Commons" },
  description: "Grown-up social media for digital democracies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
