"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, GraduationCap, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { SoapFault } from "@/types";

const schema = z.object({
  email: z.string().email("Adresse email invalide"),
  motDePasse: z.string().min(1, "Le mot de passe est requis"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const login = useAuth((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", motDePasse: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const user = await login(values.email, values.motDePasse);
      toast.success(`Bienvenue, ${user.prenom} ${user.nom}`);
    } catch (err) {
      const fault = err as SoapFault;
      toast.error(fault.message || "Échec de la connexion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-[oklch(0.24_0.045_258)] text-white">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 60px 60px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center backdrop-blur">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Scolarité</p>
            <p className="text-xs text-white/60">Gestion académique</p>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Plateforme de gestion des étudiants, matières et notes.
          </h1>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Scolarité. Tous droits réservés.
        </p>
      </div>

      {/* Right login form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">Scolarité</p>
              <p className="text-xs text-muted-foreground">Gestion académique</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Accédez à votre espace selon votre rôle.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="adresse@email.com"
                  className="pl-9"
                  autoComplete="email"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="motDePasse">Mot de passe</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="motDePasse"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  autoComplete="current-password"
                  {...register("motDePasse")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.motDePasse && (
                <p className="text-xs text-destructive">{errors.motDePasse.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
