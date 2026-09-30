"use client";

import { useEffect, useSyncExternalStore } from "react";
import { logout } from "@/app/auth-actions";
import { isTabUnlocked } from "@/lib/utils";

const noSubscribe = () => () => {};

/**
 * Νέα καρτέλα (ή ξανά-άνοιγμα αφού έκλεισε) = χωρίς σημάδι στο sessionStorage
 * → έξοδος, ώστε να ζητηθεί ξανά κωδικός/αποτύπωμα. Μέχρι να γίνει ο έλεγχος
 * (μετά το hydration) δεν δείχνει τίποτα, για να μη φανούν δεδομένα ούτε στιγμιαία.
 * ponytail: η έξοδος σβήνει το cookie, άρα αποσυνδέει και άλλες ανοιχτές
 * καρτέλες στην επόμενη ενέργειά τους.
 */
export function TabLock({ children }: { children: React.ReactNode }) {
  const unlocked = useSyncExternalStore(noSubscribe, isTabUnlocked, () => null);

  useEffect(() => {
    if (unlocked === false) logout();
  }, [unlocked]);

  return unlocked ? children : null;
}
