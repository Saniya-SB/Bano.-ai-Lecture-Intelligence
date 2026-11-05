"use client";

import React, { useState } from "react";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { MobileNavSheet } from "./mobile-nav-sheet";
import { Menu } from "lucide-react";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-bano-bg/90 backdrop-blur px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {title && (
            <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
              {title}
            </h2>
          )}
        </div>

        <div className="flex items-center gap-3">
          <UserMenu />
        </div>
      </header>

      <MobileNavSheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}
