export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: "/dashboard",
  LECTURES: "/lectures",
  NEW_LECTURE: "/lectures/new",
  LECTURE_PROCESSING: (id: string) => `/lectures/${id}/processing`,
  LECTURE_WORKSPACE: (id: string) => `/lectures/${id}`,
  BENCHMARK: "/benchmark",
  SETTINGS: "/settings",
  PROFILE: "/profile",
  ABOUT: "/about",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  CONTACT: "/contact",
  DEV_STYLEGUIDE: "/dev/styleguide",
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
