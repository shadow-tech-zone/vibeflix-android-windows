import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "vibeflix-private-prototype-my-list";

function readSavedIds() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function useMyList() {
  const [savedIds, setSavedIds] = useState(readSavedIds);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      // My List stays usable in memory if this browser blocks local storage.
    }
  }, [savedIds]);

  const toggleSaved = useCallback((id) => {
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((savedId) => savedId !== id)
        : [...current, id],
    );
  }, []);

  return { savedIds, savedSet, toggleSaved };
}
