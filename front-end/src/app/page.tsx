"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth-store";
import { LoginPage } from "@/components/auth/login-page";
import { AppShell } from "@/components/layout/app-shell";
import { ViewRouter } from "@/components/view-router";
import { GraduationCap } from "lucide-react";

export default function Page() {
  const status = useAuth((s) => s.status);
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <ViewRouter />
    </AppShell>
  );
}
