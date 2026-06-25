import { useId, useState } from "react";
import { toast } from "sonner";
import {
  sendMoneySchema,
  ownTransferSchema,
  formatIban,
  validateIban,
} from "./send-money-schema";
import { report } from "@/lib/error-reporter";
import { BUG_TYPE } from "@/lib/bug-type";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/data/use-accounts";
import { useRecipients } from "@/hooks/data/use-recipients";
import { useTransfer } from "@/hooks/data/use-transfers";
import type { Account } from "@/bindings/Account";
import type { CreateTransferRequest } from "@/bindings/CreateTransferRequest";

const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30";
const selectCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30";
const errorCls = "mt-1 text-xs text-red-500";

type Mode = "recipient" | "own";

export type SendMoneyPrefill = {
  recipientName?: string;
  recipientIban?: string;
  amount?: string;
};

type Props = {
  onClose: () => void;
  prefill?: SendMoneyPrefill;
};

type FieldErrors = Partial<Record<"recipientName" | "iban" | "amount", string>>;
type OwnErrors = Partial<Record<"amount", string>>;

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
  request: CreateTransferRequest;
  label: string;
};

export function SendMoneyModal({ onClose, prefill }: Props) {
  const uid = useId();
  const ids = {
    fromAccount: `${uid}-from-account`,
    savedRecipient: `${uid}-saved-recipient`,
    recipientName: `${uid}-recipient-name`,
    iban: `${uid}-iban`,
    amount: `${uid}-amount`,
    description: `${uid}-description`,
    ownFrom: `${uid}-own-from`,
    ownTo: `${uid}-own-to`,
    ownAmount: `${uid}-own-amount`,
    ownDesc: `${uid}-own-desc`,
  };

  const [mode, setMode] = useState<Mode>("recipient");

  // Recipient mode state
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("manual");
  const [recipientName, setRecipientName] = useState(prefill?.recipientName ?? "");
  const [recipientIban, setRecipientIban] = useState(prefill?.recipientIban ?? "");
  const [fromAccountId, setFromAccountId] = useState("");
  const [amount, setAmount] = useState(prefill?.amount ?? "");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // Own-account mode state
  const [ownFromId, setOwnFromId] = useState("");
  const [ownToId, setOwnToId] = useState("");
  const [ownAmount, setOwnAmount] = useState("");
  const [ownDesc, setOwnDesc] = useState("");
  const [ownErrors, setOwnErrors] = useState<OwnErrors>({});

  // Confirmation state
  const [confirmPayload, setConfirmPayload] = useState<ConfirmPayload | null>(null);

  const { data: accounts = [] } = useAccounts();
  const { data: recipientsPage } = useRecipients(1);
  const recipients = recipientsPage?.data ?? [];

  const { mutate: doTransfer, isPending } = useTransfer();

  const fromAccount: Account | undefined = accounts.find((a) => a.unid === fromAccountId);
  const currencySymbol = fromAccount ? getCurrencySymbol(fromAccount.currency) : "€";

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleRecipientSelect(id: string) {
    setSelectedRecipientId(id);
    if (id !== "manual") {
      const r = recipients.find((r) => r.unid === id);
      if (r) {
        setRecipientName(r.name);
        setRecipientIban(formatIban(r.iban ?? ""));
      }
    } else {
      if (!prefill) {
        setRecipientName("");
        setRecipientIban("");
      }
    }
  }

  function handleIbanChange(raw: string) {
    setRecipientIban(formatIban(raw));
    if (errors.iban) clearError("iban");
  }

  function handleIbanBlur() {
    const clean = recipientIban.replace(/\s/g, "");
    if (clean && !validateIban(recipientIban)) {
      setErrors((prev) => ({ ...prev, iban: "Invalid IBAN" }));
    } else {
      clearError("iban");
    }
  }

  function handleAmountBlur() {
    const num = Number.parseFloat(amount);
    if (!Number.isNaN(num) && num > 0) {
      setAmount(num.toFixed(2));
    }
    const amountNum = Number.parseFloat(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setErrors((prev) => ({ ...prev, amount: "Enter a valid amount" }));
    } else if (fromAccount && amountNum > Number(fromAccount.balance)) {
      setErrors((prev) => ({ ...prev, amount: "Insufficient funds" }));
    } else {
      clearError("amount");
    }
  }

  function handleOwnAmountBlur() {
    const num = Number.parseFloat(ownAmount);
    if (!Number.isNaN(num) && num > 0) setOwnAmount(num.toFixed(2));
    const ownFrom = accounts.find((a) => a.unid === ownFromId);
    if (!ownAmount || Number.isNaN(num) || num <= 0) {
      setOwnErrors({ amount: "Enter a valid amount" });
    } else if (ownFrom && num > Number(ownFrom.balance)) {
      setOwnErrors({ amount: "Insufficient funds" });
    } else {
      setOwnErrors({});
    }
  }

  function handleSubmitRecipient(e: React.FormEvent) {
    e.preventDefault();

    const result = sendMoneySchema.safeParse({
      fromAccountId,
      recipientName,
      iban: recipientIban,
      amount,
      description: description || undefined,
    });

    if (!result.success) {
      const newErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field === "fromAccountId") toast.error(issue.message);
        else if (field === "recipientName" && !newErrors.recipientName) newErrors.recipientName = issue.message;
        else if (field === "iban" && !newErrors.iban) newErrors.iban = issue.message;
        else if (field === "amount" && !newErrors.amount) newErrors.amount = issue.message;
      }
      setErrors(newErrors);
      return;
    }

    const { amount: amountNum, recipientName: trimmedName } = result.data;

    if (fromAccount && amountNum > Number(fromAccount.balance)) {
      setErrors({ amount: "Insufficient funds" });
      return;
    }

    const recipientId =
      selectedRecipientId !== "manual" ? selectedRecipientId : undefined;

    const request: CreateTransferRequest = {
      from_account_unid: fromAccountId,
      to_recipient_unid: recipientId ?? null,
      to_account_unid: null,
      amount: amountNum,
      description: description.trim() || null,
      reference: null,
    };

    const amountDisplay = formatAmountDisplay(fromAccount?.currency ?? "EUR", amountNum);
    setConfirmPayload({ request, label: `Send ${amountDisplay} to ${trimmedName}?` });
  }

  function handleSubmitOwn(e: React.FormEvent) {
    e.preventDefault();

    if (ownFromId && ownToId && ownFromId === ownToId) {
      toast.error("Source and destination must differ.");
      return;
    }

    const result = ownTransferSchema.safeParse({
      fromAccountId: ownFromId,
      toAccountId: ownToId,
      amount: ownAmount,
      description: ownDesc || undefined,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (field === "fromAccountId" || field === "toAccountId") {
          toast.error(issue.message);
          return;
        }
        if (field === "amount") {
          setOwnErrors({ amount: issue.message });
          return;
        }
      }
      return;
    }

    const { amount: amountNum } = result.data;
    const ownFrom = accounts.find((a) => a.unid === ownFromId);
    if (ownFrom && amountNum > Number(ownFrom.balance)) {
      setOwnErrors({ amount: "Insufficient funds" });
      return;
    }

    const request: CreateTransferRequest = {
      from_account_unid: ownFromId,
      to_recipient_unid: null,
      to_account_unid: ownToId,
      amount: amountNum,
      description: ownDesc.trim() || null,
      reference: null,
    };

    const amountDisplay = formatAmountDisplay(ownFrom?.currency ?? "EUR", amountNum);
    const toAcct = accounts.find((a) => a.unid === ownToId);
    setConfirmPayload({
      request,
      label: `Transfer ${amountDisplay} to ${toAcct?.label ?? "account"}?`,
    });
  }

  function handleConfirm() {
    if (!confirmPayload) return;
    doTransfer(confirmPayload.request, {
      onSuccess: () => {
        toast.success("Transfer sent.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        {confirmPayload ? (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Confirm Transfer</h2>
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
            <h2 className="mb-4 text-sm font-semibold">Send Money</h2>

            {/* Mode tabs */}
            <div className="mb-4 flex rounded-lg border overflow-hidden text-xs font-medium">
              <button
                type="button"
                className={`flex-1 py-1.5 transition-colors ${mode === "recipient" ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => setMode("recipient")}
              >
                To Recipient
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 transition-colors ${mode === "own" ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => setMode("own")}
              >
                Between My Accounts
              </button>
            </div>

            {mode === "recipient" ? (
              <form onSubmit={handleSubmitRecipient} className="space-y-3">
                <div>
                  <label htmlFor={ids.fromAccount} className={labelCls}>
                    From Account *
                  </label>
                  <select
                    id={ids.fromAccount}
                    className={selectCls}
                    value={fromAccountId}
                    onChange={(e) => {
                      setFromAccountId(e.target.value);
                      clearError("amount");
                    }}
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

                {!prefill && recipients.length > 0 && (
                  <div>
                    <label htmlFor={ids.savedRecipient} className={labelCls}>
                      Saved Recipient
                    </label>
                    <select
                      id={ids.savedRecipient}
                      className={selectCls}
                      value={selectedRecipientId}
                      onChange={(e) => handleRecipientSelect(e.target.value)}
                    >
                      <option value="manual">Enter manually…</option>
                      {recipients.map((r) => (
                        <option key={r.unid} value={r.unid}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor={ids.recipientName} className={labelCls}>
                    Recipient Name *
                  </label>
                  <input
                    id={ids.recipientName}
                    className={`${inputCls} ${errors.recipientName ? "border-red-500" : ""}`}
                    value={recipientName}
                    onChange={(e) => {
                      setRecipientName(e.target.value);
                      if (errors.recipientName) clearError("recipientName");
                    }}
                    placeholder="Jane Smith"
                    required
                  />
                  {errors.recipientName && (
                    <p className={errorCls}>{errors.recipientName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor={ids.iban} className={labelCls}>
                    IBAN *
                  </label>
                  <input
                    id={ids.iban}
                    className={`${inputCls} ${errors.iban ? "border-red-500" : ""}`}
                    value={recipientIban}
                    onChange={(e) => handleIbanChange(e.target.value)}
                    onBlur={handleIbanBlur}
                    placeholder="GB29 NWBK 6016 1331 9268 19"
                    required
                  />
                  {errors.iban && <p className={errorCls}>{errors.iban}</p>}
                </div>

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
                      onBlur={handleAmountBlur}
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
                    placeholder="e.g. Rent payment"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Send
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmitOwn} className="space-y-3">
                <div>
                  <label htmlFor={ids.ownFrom} className={labelCls}>
                    From Account *
                  </label>
                  <select
                    id={ids.ownFrom}
                    className={selectCls}
                    value={ownFromId}
                    onChange={(e) => {
                      setOwnFromId(e.target.value);
                      setOwnErrors({});
                    }}
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

                <div>
                  <label htmlFor={ids.ownTo} className={labelCls}>
                    To Account *
                  </label>
                  <select
                    id={ids.ownTo}
                    className={selectCls}
                    value={ownToId}
                    onChange={(e) => setOwnToId(e.target.value)}
                    required
                  >
                    <option value="">Select account…</option>
                    {accounts
                      .filter((a) => a.unid !== ownFromId)
                      .map((a) => (
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

                <div>
                  <label htmlFor={ids.ownAmount} className={labelCls}>
                    Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                      {ownFromId
                        ? getCurrencySymbol(
                            accounts.find((a) => a.unid === ownFromId)?.currency ?? "EUR",
                          )
                        : "€"}
                    </span>
                    <input
                      id={ids.ownAmount}
                      className={`${inputCls} pl-7 ${ownErrors.amount ? "border-red-500" : ""}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={ownAmount}
                      onChange={(e) => {
                        setOwnAmount(e.target.value);
                        if (ownErrors.amount) setOwnErrors({});
                      }}
                      onBlur={handleOwnAmountBlur}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  {ownErrors.amount && <p className={errorCls}>{ownErrors.amount}</p>}
                </div>

                <div>
                  <label htmlFor={ids.ownDesc} className={labelCls}>
                    Description (optional)
                  </label>
                  <input
                    id={ids.ownDesc}
                    className={inputCls}
                    value={ownDesc}
                    onChange={(e) => setOwnDesc(e.target.value)}
                    placeholder="e.g. Savings top-up"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Transfer
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
