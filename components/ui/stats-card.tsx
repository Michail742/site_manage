import * as React from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Βάση: "Stats Card" από το 21st.dev (ravikatiyar162/stats-card-1),
// προσαρμοσμένο στο base-nova Card και με χρωματιστό icon chip.
interface StatsCardProps {
  title: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ReactNode;
  iconClassName?: string;
  className?: string;
}

export function StatsCard({ title, value, sub, icon, iconClassName, className }: StatsCardProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <CardAction>
          <div className={cn("rounded-lg p-2", iconClassName)}>{icon}</div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
