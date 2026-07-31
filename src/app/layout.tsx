import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "TFGen — Générateur Terraform/Ansible",
  description: "Générateur interne de configurations Terraform à partir des fiches FIS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen" style={{ background: "#09090B", color: "#FAFAFA" }}>
        {children}
      </body>
    </html>
  );
}
