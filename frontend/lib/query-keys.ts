export const queryKeys = {
  me: () => ["me"] as const,
  dashboardStats: () => ["dashboard-stats"] as const,
  dashboardUsers: () => ["dashboard-users"] as const,
  transactions: {
    list: (page: number, accountUnid?: string) =>
      ["transactions", "list", page, accountUnid ?? null] as const,
  },
  invoices: {
    list: (page: number) => ["invoices", "list", page] as const,
    detail: (id: string) => ["invoices", "detail", id] as const,
  },
  bugreports: {
    all: () => ["bugreports"] as const,
    list: (page: number, search: string, bugType: string) =>
      ["bugreports", page, search, bugType] as const,
  },
};
