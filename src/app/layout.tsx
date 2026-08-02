import "./globals.css";
import type { ReactNode } from "react";
import { Manrope, Roboto_Mono } from "next/font/google";

const ui = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-ui" });
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata = {
  title: "TFGen — Générateur Terraform/Ansible",
  description: "Générateur interne de configurations Terraform à partir des fiches FIS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${ui.variable} ${mono.variable}`}>
      <body className="min-h-screen" style={{ background: "#0D0C0A", color: "#F5F2ED" }}>
        {children}
      </body>
    </html>
  );
}
