
"use client";

import {
  User,
  Mail,
  IdCard,
  GraduationCap,
  MapPin,
  CalendarDays,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/store/auth-store";
import { useAsync } from "@/hooks/use-async";
import { SectionHeader } from "@/components/shared/section-header";
import { TableSkeleton, CardGridSkeleton } from "@/components/shared/loading";
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
        <TableSkeleton rows={5} cols={2} />
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

  // Prefer the academic assignment returned by the backend.
  const section = d?.sectionNom || "Non affectée";
  const classe = d?.classeNom || d?.classe || user?.classe || "Non affectée";

  const initials =
    `${prenom !== "—" ? prenom.charAt(0) : ""}${
      nom !== "—" ? nom.charAt(0) : ""
    }`.toUpperCase();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mon profil"
        description="Vos informations personnelles et académiques."
      />

      {/* Student identity and academic assignment */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground shadow-sm">
                {initials || "?"}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold tracking-tight">
                  {prenom} {nom}
                </h2>

                <p className="mt-0.5 break-all text-sm text-muted-foreground">
                  {email}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {user?.role && <RoleBadge role={user.role} />}

                  <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">
                    <BookOpen className="h-3.5 w-3.5" />
                    Section : {section}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Classe : {classe}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Personal and academic information */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Informations personnelles & académiques
            </CardTitle>

            <CardDescription>
              Informations de votre dossier étudiant.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-1">
            <DetailRow
              icon={User}
              label="Nom"
              value={nom}
            />

            <DetailRow
              icon={User}
              label="Prénom"
              value={prenom}
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
              value={d?.matricule || "—"}
              mono
            />

            <DetailRow
              icon={BookOpen}
              label="Section"
              value={section}
            />

            <DetailRow
              icon={GraduationCap}
              label="Classe"
              value={classe}
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
              Informations relatives à votre compte utilisateur.
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
              valueNode={
                user?.role ? <RoleBadge role={user.role} /> : <Dash />
              }
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
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-0">
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
                ? "break-all font-mono text-xs font-medium"
                : "break-words text-sm font-medium"
            }
          >
            {value || "—"}
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
