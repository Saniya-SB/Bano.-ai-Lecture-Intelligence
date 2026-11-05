import { env } from "@/config/env";
import { apiClient } from "./api-client";
import { mockStore } from "./mock/mock-store";
import { UserDto } from "@/types/api/common";
import { User } from "@/types/domain/common";
import { mapUserDtoToDomain } from "./adapters/common-adapter";

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.getCurrentUser();
      return dto ? mapUserDtoToDomain(dto) : null;
    }
    try {
      const dto = await apiClient<UserDto>("/users/me");
      return mapUserDtoToDomain(dto);
    } catch {
      return null;
    }
  },

  async login(credentials: { email: string; password: string; rememberMe?: boolean }): Promise<User> {
    if (env.USE_MOCK_API) {
      mockStore.setAuthenticated(true);
      const user = await mockStore.getCurrentUser();
      if (!user) throw new Error("Mock user not found");
      return mapUserDtoToDomain(user);
    }
    const dto = await apiClient<UserDto>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return mapUserDtoToDomain(dto);
  },

  async signup(data: { full_name: string; email: string; password: string }): Promise<User> {
    if (env.USE_MOCK_API) {
      mockStore.setAuthenticated(true);
      const user = await mockStore.getCurrentUser();
      if (!user) throw new Error("Mock user not found");
      return mapUserDtoToDomain(user);
    }
    const dto = await apiClient<UserDto>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapUserDtoToDomain(dto);
  },

  async logout(): Promise<void> {
    if (env.USE_MOCK_API) {
      mockStore.setAuthenticated(false);
      return;
    }
    try {
      await apiClient<void>("/auth/logout", { method: "POST" });
    } catch {
      // Best-effort logout
    }
  },
};
