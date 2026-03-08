import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morph Studio",
  description: "Artifacts from the Void",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
