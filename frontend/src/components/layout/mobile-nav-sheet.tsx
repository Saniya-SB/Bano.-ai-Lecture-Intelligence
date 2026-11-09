"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Settings,
  PlusCircle,
  User,
} from "lucide-react";

interface MobileNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: "Lectures", href: ROUTES.LECTURES, icon: BookOpen },
    { label: "Benchmark", href: ROUTES.BENCHMARK, icon: BarChart3 },
    { label: "Profile", href: ROUTES.PROFILE, icon: User },
    { label: "Settings", href: ROUTES.SETTINGS, icon: Settings },
  ];

  const handleLinkClick = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">
              bano<span className="text-bano-accent">.</span>ai
            </span>
            <span className="rounded-sm bg-card border border-border px-1.5 py-0.5 text-[10px] font-mono text-bano-text-subtle uppercase">
              STUDENT
            </span>
          </div>

          <Button
            asChild
            className="w-full justify-center gap-2 h-10 shadow-none font-medium"
            onClick={handleLinkClick}
          >
            <Link href={ROUTES.NEW_LECTURE}>
              <PlusCircle className="h-4 w-4" />
              New Lecture
            </Link>
          </Button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active =
                item.href === ROUTES.DASHBOARD
                  ? pathname === ROUTES.DASHBOARD
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-3 px-3 h-11 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-bano-accent-soft text-bano-accent font-semibold"
                      : "text-bano-text-muted hover:bg-card/70 hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="text-xs text-bano-text-subtle font-mono pt-4 border-t border-border">
          Bano.ai &bull; Hinglish Intelligence
        </div>
      </SheetContent>
    </Sheet>
  );
}
