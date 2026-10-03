import * as React from "react";

// Βάση: "Core Header Navbar" από το 21st.dev (kumail_ali_r/core-header-navbar).
// Κρατήθηκε το grid-fade background· το avatar/"Active Now" αφαιρέθηκαν
// (δεν υπάρχει user profile στο app) και μπήκε slot για actions.
interface SimpleNavbarProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function SimpleNavbar({ icon, title, subtitle, children }: SimpleNavbarProps) {
  return (
    <header className="relative flex flex-wrap items-center gap-3 overflow-hidden rounded-xl border bg-background/50 px-4 py-3 backdrop-blur-md">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--muted) 1px, transparent 1px),
            linear-gradient(to bottom, var(--muted) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)",
          maskImage: "radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)",
        }}
      />
      {icon && <div className="rounded-lg bg-primary/10 p-2">{icon}</div>}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
