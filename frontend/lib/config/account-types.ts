import type { AccountType } from "../../../backend/bindings/AccountType";

export const ACCOUNT_TYPE_META: Record<AccountType, { gradient: string; brand: string }> = {
  checking:   { gradient: "from-blue-600 to-blue-700",       brand: "VISA" },
  savings:    { gradient: "from-amber-400 to-amber-500",     brand: "MASTERCARD" },
  business:   { gradient: "from-emerald-500 to-emerald-600", brand: "AMEX" },
  investment: { gradient: "from-purple-500 to-purple-600",   brand: "DISCOVER" },
};
