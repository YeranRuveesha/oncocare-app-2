"use client";

import { useEffect, useState } from "react";

export interface Option {
  id: string;
  name: string;
}

/** Active hospitals (for sign-up). */
export function useHospitals(enabled = true) {
  const [list, setList] = useState<Option[]>([]);
  useEffect(() => {
    if (!enabled) return;
    fetch("/api/public/hospitals")
      .then((r) => r.json())
      .then((j) => setList(j.hospitals ?? []))
      .catch(() => setList([]));
  }, [enabled]);
  return list;
}

/** Active, approved doctors of one hospital. */
export function useDoctors(hospitalId: string | undefined) {
  const [list, setList] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!hospitalId) {
      setList([]);
      return;
    }
    setLoading(true);
    fetch(`/api/public/doctors?hospital=${encodeURIComponent(hospitalId)}`)
      .then((r) => r.json())
      .then((j) => setList(j.doctors ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [hospitalId]);
  return { doctors: list, loading };
}
