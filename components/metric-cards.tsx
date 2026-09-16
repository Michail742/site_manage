import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Activity, RefreshCw } from "lucide-react";
import { type VercelProject } from "@/lib/vercel";

function calcMetrics(projects: VercelProject[]) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  let ready = 0;
  let recentDeploys = 0;

  for (const p of projects) {
    const latest = p.latestDeployments?.[0];
    if (latest?.readyState === "READY" && !p.paused) ready++;
    if (latest && latest.createdAt >= sevenDaysAgo) recentDeploys++;
  }

  const uptimePct =
    projects.length > 0 ? Math.round((ready / projects.length) * 100) : 0;

  return { total: projects.length, ready, uptimePct, recentDeploys };
}

interface MetricCardsProps {
  projects: VercelProject[];
}

export function MetricCards({ projects }: MetricCardsProps) {
  const { total, ready, uptimePct, recentDeploys } = calcMetrics(projects);

  const cards: {
    label: string;
    value: string | number;
    sub: string;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
  }[] = [
    {
      label: "Συνολικά Projects",
      value: total,
      sub: "web projects στο Vercel",
      icon: Globe,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "Online / Uptime",
      value: `${ready} / ${total}`,
      sub: `${uptimePct}% sites online`,
      icon: Activity,
      iconColor: uptimePct === 100 ? "text-green-500" : uptimePct >= 80 ? "text-yellow-500" : "text-red-500",
      iconBg: uptimePct === 100 ? "bg-green-500/10" : uptimePct >= 80 ? "bg-yellow-500/10" : "bg-red-500/10",
    },
    {
      label: "Πρόσφατα Updates",
      value: recentDeploys,
      sub: "deployments τις τελευταίες 7 μέρες",
      icon: RefreshCw,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
        <Card key={label} className="relative overflow-hidden">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                  {label}
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {value}
                </p>
                <p className="text-xs text-muted-foreground leading-snug">{sub}</p>
              </div>
              <div className={`shrink-0 rounded-lg p-2 ${iconBg}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
