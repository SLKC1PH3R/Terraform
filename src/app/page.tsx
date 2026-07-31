import { Suspense } from "react";
import AppShell from "@/components/tfgen/AppShell";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <AppShell />
    </Suspense>
  );
}
