"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Settings,
  PlusCircle,
  HelpCircle,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "Lectures", href: ROUTES.LECTURES, icon: BookOpen },
  { label: "Benchmark", href: ROUTES.BENCHMARK, icon: BarChart3 },
];

const secondaryNavItems: NavItem[] = [
  { label: "Settings", href: ROUTES.SETTINGS, icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === ROUTES.DASHBOARD) {
      return pathname === ROUTES.DASHBOARD;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex flex-col justify-between w-64 border-r border-border bg-bano-surface-sunken p-4 select-none shrink-0",
        className
      )}
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-2 px-2 py-1">
          <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2">
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">
              bano<span className="text-bano-accent">.</span>ai
            </span>
            <span className="rounded-sm bg-card border border-border px-1.5 py-0.5 text-[10px] font-mono text-bano-text-subtle uppercase">
              STUDENT
            </span>
          </Link>
        </div>

        {/* Primary Action Button */}
        <div>
          <Button
            asChild
            className="w-full justify-center gap-2 h-10 shadow-none font-medium"
          >
            <Link href={ROUTES.NEW_LECTURE}>
              <PlusCircle className="h-4 w-4" />
              New Lecture
            </Link>
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 h-10 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-bano-accent-soft text-bano-accent font-semibold"
                    : "text-bano-text-muted hover:bg-card/70 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "text-bano-accent" : "text-bano-text-subtle"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-1 pt-6 border-t border-border">
        {secondaryNavItems.map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-10 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-bano-accent-soft text-bano-accent font-semibold"
                  : "text-bano-text-muted hover:bg-card/70 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-bano-accent" : "text-bano-text-subtle"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="px-3 py-2 text-[11px] font-mono text-bano-text-subtle">
          Bano.ai v1.0 &bull; Hinglish
        </div>
      </div>
    </aside>
  );
}
