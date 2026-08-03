import "./globals.css";
import type { ReactNode } from "react";
import { Manrope, Roboto_Mono } from "next/font/google";

const sans = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope" });
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-roboto-mono" });

export const metadata = {
  title: "TFGen — Générateur Terraform/Ansible",
  description: "Générateur interne de configurations Terraform à partir des fiches FIS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
