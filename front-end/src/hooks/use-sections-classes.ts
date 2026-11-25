"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import type { Section, Classe, SoapFault } from "@/types";

export function useSectionsClasses() {
  const [sections, setSections] = useState<Section[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [secs, cls] = await Promise.all([
        api.sections.list(),
        api.sections.listClasses(),
      ]);
      setSections(secs);
      setClasses(cls);
    } catch (e) {
      const err = e as SoapFault;
      setError(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { sections, classes, loading, error, refresh: load };
}
