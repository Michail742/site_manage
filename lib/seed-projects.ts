import { type ManualProject } from "@/lib/types";

// Projects εκτός Vercel που θέλουμε να υπάρχουν πάντα στη λίστα.
// Τα ids είναι σταθερά (όχι `manual_${Date.now()}`) ώστε το merge στο
// localStorage να τα αναγνωρίζει και να μη δημιουργεί διπλότυπα σε κάθε load.
export const SEED_MANUAL_PROJECTS: ManualProject[] = [
  {
    id: "seed_anyweather",
    name: "anyweather",
    url: "https://anyweather.pages.dev/",
    framework: "other",
    status: "READY",
    createdAt: 0,
    enabled: true,
  },
];
