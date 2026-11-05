import React from "react";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { ROUTES } from "@/config/routes";

export function Footer() {
  const footerLinks = [
    { label: "About", href: ROUTES.ABOUT },
    { label: "Privacy", href: ROUTES.PRIVACY },
    { label: "Terms", href: ROUTES.TERMS },
    { label: "Contact", href: ROUTES.CONTACT },
  ];

  return (
    <footer className="w-full border-t border-border bg-bano-bg py-12">
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-heading font-bold text-lg text-foreground">
              bano<span className="text-bano-accent">.</span>ai
            </span>
            <p className="text-xs text-bano-text-muted">
              {BRAND.tagline} &bull; Hinglish Speech & Learning AI
            </p>
          </div>

          <nav className="flex items-center gap-6 text-sm text-bano-text-muted">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-bano-text-subtle">{BRAND.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
