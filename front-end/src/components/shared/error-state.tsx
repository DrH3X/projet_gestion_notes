"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SoapFault } from "@/types";

interface ErrorStateProps {
  error: SoapFault | Error | string;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message =
    !error
      ? "Une erreur est survenue"
      : typeof error === "string"
      ? error
      : "message" in error
      ? error.message
      : "Une erreur est survenue";
  const code = typeof error === "object" && "code" in error ? (error as SoapFault).code : undefined;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{code ? `Erreur (${code})` : "Une erreur est survenue"}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{message}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
