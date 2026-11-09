"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MotionRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
  threshold?: number;
}

/**
 * Lightweight, zero-dependency motion reveal component.
 * Uses IntersectionObserver to smoothly fade and slide in content when scrolled into view.
 * Respects user's prefers-reduced-motion settings.
 */
export function MotionReveal({
  children,
  delayMs = 0,
  className,
  threshold = 0.12,
  ...props
}: MotionRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect accessibility settings
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: "700ms",
        transitionDelay: `${delayMs}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={cn(
        "transition-all will-change-transform",
        isVisible
          ? "opacity-100 translate-y-0 filter-none"
          : "opacity-0 translate-y-7 filter blur-[1px]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
