import React from "react";
import { StatsCard } from "@/components/ui/stats-card";
import { Globe, Activity, RefreshCw } from "lucide-react";
import { type DisplayProject } from "@/lib/types";

function calcMetrics(projects: DisplayProject[]) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  let ready = 0;
  let recentDeploys = 0;

  for (const p of projects) {
    if (p.status === "READY" && p.enabled) ready++;
    if (p.deployedAt && p.deployedAt >= sevenDaysAgo) recentDeploys++;
  }

  const uptimePct =
    projects.length > 0 ? Math.round((ready / projects.length) * 100) : 0;

  return { total: projects.length, ready, uptimePct, recentDeploys };
}

interface MetricCardsProps {
  projects: DisplayProject[];
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
      sub: "web projects σε Vercel + Cloudflare",
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
        <StatsCard
          key={label}
          title={label}
          value={value}
          sub={sub}
          icon={<Icon className={`w-4 h-4 ${iconColor}`} />}
          iconClassName={iconBg}
        />
      ))}
    </div>
  );
}
