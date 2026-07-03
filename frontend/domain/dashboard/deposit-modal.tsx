import { useId, useState } from "react";
import { toast } from "sonner";
import { depositSchema } from "./deposit-schema";
import { formatIban } from "./send-money-schema";
import { report } from "@/lib/error-reporter";
import { BUG_TYPE } from "@/lib/bug-type";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAccounts } from "@/hooks/data/use-accounts";
import { useDeposit } from "@/hooks/data/use-deposits";
import type { Account } from "@/bindings/Account";
import type { CreateDepositRequest } from "@/bindings/CreateDepositRequest";
import type { DepositSource } from "@/bindings/DepositSource";

const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30";
const selectCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30";
const errorCls = "mt-1 text-xs text-red-500";

const SOURCE_TABS: { value: DepositSource; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
];

type Props = { onClose: () => void };

type FieldErrors = Partial<Record<"toAccountId" | "sourceName" | "sourceIban" | "amount", string>>;

function getCurrencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

function formatAmountDisplay(currency: string, amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
}

type ConfirmPayload = {
  request: CreateDepositRequest;
  label: string;
};

export function DepositModal({ onClose }: Props) {
  const uid = useId();
  const ids = {
    toAccount: `${uid}-to-account`,
    sourceName: `${uid}-source-name`,
    sourceIban: `${uid}-source-iban`,
    amount: `${uid}-amount`,
    description: `${uid}-description`,
  };

  const [toAccountId, setToAccountId] = useState("");
  const [source, setSource] = useState<DepositSource>("bank_transfer");
  const [sourceName, setSourceName] = useState("");
  const [sourceIban, setSourceIban] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmPayload, setConfirmPayload] = useState<ConfirmPayload | null>(null);

  const { data: accounts = [] } = useAccounts();
  const { mutate: doDeposit, isPending } = useDeposit();

  const toAccount: Account | undefined = accounts.find((a) => a.unid === toAccountId);
  const currencySymbol = toAccount ? getCurrencySymbol(toAccount.currency) : "€";

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSourceChange(next: DepositSource) {
    setSource(next);
    clearError("sourceName");
    clearError("sourceIban");
    if (next === "cash") {
      setSourceName("Cash deposit");
      setSourceIban("");
    } else if (sourceName === "Cash deposit") {
      setSourceName("");
    }
  }

  function handleIbanChange(raw: string) {
    setSourceIban(formatIban(raw));
    if (errors.sourceIban) clearError("sourceIban");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = depositSchema.safeParse({
      toAccountId,
      source,
      sourceName,
      sourceIban: source === "bank_transfer" ? sourceIban : undefined,
      amount,
      description: description || undefined,
    });

    if (!result.success) {
      const newErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field === "toAccountId") toast.error(issue.message);
        else if (field === "sourceName" && !newErrors.sourceName) newErrors.sourceName = issue.message;
        else if (field === "sourceIban" && !newErrors.sourceIban) newErrors.sourceIban = issue.message;
        else if (field === "amount" && !newErrors.amount) newErrors.amount = issue.message;
      }
      setErrors(newErrors);
      return;
    }

    const { amount: amountNum } = result.data;

    const request: CreateDepositRequest = {
      to_account_unid: toAccountId,
      source,
      source_name: result.data.sourceName,
      source_iban: source === "bank_transfer" ? sourceIban : null,
      amount: amountNum,
      description: description.trim() || null,
    };

    const amountDisplay = formatAmountDisplay(toAccount?.currency ?? "EUR", amountNum);
    setConfirmPayload({ request, label: `Deposit ${amountDisplay} into ${toAccount?.label ?? "account"}?` });
  }

  function handleConfirm() {
    if (!confirmPayload) return;
    doDeposit(confirmPayload.request, {
      onSuccess: () => {
        toast.success("Deposit complete.");
        onClose();
      },
      onError: (err) => {
        toast.error(err.message);
        report({ bugType: BUG_TYPE.Server, message: err.message, ...(err.stack ? { stackTrace: err.stack } : {}) });
        setConfirmPayload(null);
      },
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-sm">
        {confirmPayload ? (
          <div className="space-y-4">
            <DialogTitle>Confirm Deposit</DialogTitle>
            <p className="text-sm text-muted-foreground">{confirmPayload.label}</p>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmPayload(null)}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                type="button"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleConfirm}
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Confirm
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogTitle className="mb-4">Deposit</DialogTitle>

            <div className="mb-4 flex rounded-lg border overflow-hidden text-xs font-medium">
              {SOURCE_TABS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`flex-1 py-1.5 transition-colors ${source === value ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
                  onClick={() => handleSourceChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor={ids.toAccount} className={labelCls}>
                  To Account *
                </label>
                <select
                  id={ids.toAccount}
                  className={selectCls}
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                >
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.unid} value={a.unid}>
                      {a.label} ({getCurrencySymbol(a.currency)}
                      {Number(a.balance).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      )
                    </option>
                  ))}
                </select>
              </div>

              {source === "bank_transfer" && (
                <>
                  <div>
                    <label htmlFor={ids.sourceName} className={labelCls}>
                      Source Bank *
                    </label>
                    <input
                      id={ids.sourceName}
                      className={`${inputCls} ${errors.sourceName ? "border-red-500" : ""}`}
                      value={sourceName}
                      onChange={(e) => {
                        setSourceName(e.target.value);
                        if (errors.sourceName) clearError("sourceName");
                      }}
                      placeholder="Chase Bank"
                      required
                    />
                    {errors.sourceName && <p className={errorCls}>{errors.sourceName}</p>}
                  </div>

                  <div>
                    <label htmlFor={ids.sourceIban} className={labelCls}>
                      Source IBAN *
                    </label>
                    <input
                      id={ids.sourceIban}
                      className={`${inputCls} ${errors.sourceIban ? "border-red-500" : ""}`}
                      value={sourceIban}
                      onChange={(e) => handleIbanChange(e.target.value)}
                      placeholder="GB29 NWBK 6016 1331 9268 19"
                      required
                    />
                    {errors.sourceIban && <p className={errorCls}>{errors.sourceIban}</p>}
                  </div>
                </>
              )}

              {source === "card" && (
                <div>
                  <label htmlFor={ids.sourceName} className={labelCls}>
                    Card *
                  </label>
                  <input
                    id={ids.sourceName}
                    className={`${inputCls} ${errors.sourceName ? "border-red-500" : ""}`}
                    value={sourceName}
                    onChange={(e) => {
                      setSourceName(e.target.value);
                      if (errors.sourceName) clearError("sourceName");
                    }}
                    placeholder="Visa •••• 4242"
                    required
                  />
                  {errors.sourceName && <p className={errorCls}>{errors.sourceName}</p>}
                </div>
              )}

              <div>
                <label htmlFor={ids.amount} className={labelCls}>
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                    {currencySymbol}
                  </span>
                  <input
                    id={ids.amount}
                    className={`${inputCls} pl-7 ${errors.amount ? "border-red-500" : ""}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (errors.amount) clearError("amount");
                    }}
                    placeholder="0.00"
                    required
                  />
                </div>
                {errors.amount && <p className={errorCls}>{errors.amount}</p>}
              </div>

              <div>
                <label htmlFor={ids.description} className={labelCls}>
                  Description (optional)
                </label>
                <input
                  id={ids.description}
                  className={inputCls}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Paycheck deposit"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  Deposit
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
