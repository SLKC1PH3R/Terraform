import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "TFGen — Générateur Terraform/Ansible",
  description: "Générateur interne de configurations Terraform à partir des fiches FIS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
