export const ROLES = {
  Root: "Root",
  Admin: "Admin",
  RegularUser: "RegularUser",
  Demo: "Demo",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
