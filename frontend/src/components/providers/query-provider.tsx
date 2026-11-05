"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setUnauthorizedListener } from "@/services/api-client";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { toast } from "sonner";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error: any) => {
              // Never retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  useEffect(() => {
    setUnauthorizedListener(() => {
      queryClient.clear();
      toast.error("Your session has expired. Please sign in again.");
      router.push(ROUTES.LOGIN);
    });

    return () => {
      setUnauthorizedListener(null);
    };
  }, [queryClient, router]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
