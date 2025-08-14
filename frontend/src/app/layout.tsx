import React from "react";
import "./globals.css";

export const metadata = {
  title: "Cloud VM Starter",
  description: "Starte deine Azure VMs direkt im Browser",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
