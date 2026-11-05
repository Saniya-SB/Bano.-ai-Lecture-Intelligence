"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth-service";
import { queryKeys } from "@/lib/query-keys";
import { User } from "@/types/domain/common";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";


export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<User | null>({
    queryKey: queryKeys.auth.me(),
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me(), null);
      queryClient.clear();
      router.push(ROUTES.LOGIN);
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isError,
    isAuthenticated: Boolean(user),
    logout: () => logoutMutation.mutate(),
  };
}
