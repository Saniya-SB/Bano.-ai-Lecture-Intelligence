"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ArrowRight } from "lucide-react";

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/#hero" },
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Benchmark", href: "/#benchmark" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        scrolled
          ? "bg-bano-bg/95 backdrop-blur border-b border-border shadow-sm"
          : "bg-bano-bg"
      }`}
    >
      <div className="container mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link href={ROUTES.HOME} className="flex items-center gap-2 group">
          <span className="font-heading font-bold text-xl tracking-tight text-foreground">
            bano<span className="text-bano-accent">.</span>ai
          </span>
          <span className="rounded-sm bg-bano-surface-sunken border border-border px-1.5 py-0.5 text-[10px] font-mono text-bano-text-subtle uppercase">
            v1.0
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-bano-text-muted">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" asChild className="text-sm font-medium">
            <Link href={ROUTES.LOGIN}>Sign In</Link>
          </Button>
          <Button asChild size="default" className="gap-2">
            <Link href={ROUTES.SIGNUP}>
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open mobile menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] pt-12 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-border">
                  <span className="font-heading font-bold text-xl tracking-tight text-foreground">
                    bano<span className="text-bano-accent">.</span>ai
                  </span>
                  <span className="rounded-sm bg-bano-surface-sunken border border-border px-1.5 py-0.5 text-[10px] font-mono text-bano-text-subtle uppercase">
                    v1.0
                  </span>
                </div>
                <nav className="flex flex-col space-y-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-base font-medium text-bano-text hover:text-bano-accent"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="space-y-3 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  asChild
                  onClick={() => setMobileOpen(false)}
                >
                  <Link href={ROUTES.LOGIN}>Sign In</Link>
                </Button>
                <Button
                  className="w-full justify-center gap-2"
                  asChild
                  onClick={() => setMobileOpen(false)}
                >
                  <Link href={ROUTES.SIGNUP}>
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
