"use client";

import {
  User,
  Mail,
  IdCard,
  GraduationCap,
  MapPin,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/store/auth-store";
import { useAsync } from "@/hooks/use-async";
import { SectionHeader } from "@/components/shared/section-header";
import { TableSkeleton } from "@/components/shared/loading";
import { CardGridSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { RoleBadge } from "@/components/shared/badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Dossier } from "@/types";

export function StudentProfile() {
  const { user } = useAuth();
  const me = useAsync<Dossier>(() => api.students.me(), []);

  if (me.loading) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Mon profil"
          description="Vos informations personnelles et académiques."
        />
        <CardGridSkeleton count={2} />
        <TableSkeleton rows={4} cols={2} />
      </div>
    );
  }

  if (me.error) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Mon profil"
          description="Vos informations personnelles et académiques."
        />
        <ErrorState error={me.error} onRetry={() => me.refetch()} />
      </div>
    );
  }

  const d = me.data;
  const prenom = d?.prenom ?? user?.prenom ?? "—";
  const nom = d?.nom ?? user?.nom ?? "—";
  const email = d?.email ?? user?.email ?? "—";
  const initials = `${prenom.charAt(0) ?? ""}${nom.charAt(0) ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mon profil"
        description="Vos informations personnelles et académiques."
      />

      {/* Identity card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold shadow-sm">
                {initials || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold tracking-tight">
                  {prenom} {nom}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5 break-all">
                  {email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {user?.role && <RoleBadge role={user.role} />}
                  {d?.classe && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                      <GraduationCap className="h-3 w-3" />
                      {d.classe}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Two columns: academic + account */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Personal & academic information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Informations personnelles & académiques
            </CardTitle>
            <CardDescription>
              Données issues de votre dossier (consulterMonDossier).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <DetailRow
              icon={User}
              label="Nom"
              value={nom !== "—" ? nom : "—"}
            />
            <DetailRow
              icon={User}
              label="Prénom"
              value={prenom !== "—" ? prenom : "—"}
            />
            <DetailRow
              icon={Mail}
              label="Email"
              value={email}
              mono
            />
            <DetailRow
              icon={IdCard}
              label="Matricule"
              value={d?.matricule ?? "—"}
              mono
            />
            <DetailRow
              icon={GraduationCap}
              label="Classe"
              value={d?.classe ?? user?.classe ?? "—"}
            />
            <DetailRow
              icon={CalendarDays}
              label="Date de naissance"
              value={d?.dateNaissance || "—"}
            />
            <DetailRow
              icon={MapPin}
              label="Adresse"
              value={d?.adresse || "—"}
            />
          </CardContent>
        </Card>

        {/* Account information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Compte & accès
            </CardTitle>
            <CardDescription>
              Identifiants techniques de votre compte utilisateur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <DetailRow
              icon={IdCard}
              label="Identifiant utilisateur"
              value={truncateId(user?.id ?? d?.userId ?? "—")}
              mono
            />
            <DetailRow
              icon={IdCard}
              label="Identifiant dossier"
              value={truncateId(d?.id ?? "—")}
              mono
            />
            <DetailRow
              icon={ShieldCheck}
              label="Rôle"
              valueNode={user?.role ? <RoleBadge role={user.role} /> : <Dash />}
            />
            <DetailRow
              icon={Mail}
              label="Email de connexion"
              value={email}
              mono
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueNode,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{label}</span>
      </div>
      <div className="min-w-0 text-right">
        {valueNode ? (
          valueNode
        ) : (
          <span
            className={
              mono
                ? "font-mono text-xs font-medium break-all"
                : "font-medium text-sm break-words"
            }
          >
            {value ?? "—"}
          </span>
        )}
      </div>
    </div>
  );
}

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

function truncateId(id: string): string {
  if (id === "—" || id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
