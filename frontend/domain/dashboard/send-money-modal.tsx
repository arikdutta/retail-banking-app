import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/data/use-accounts";
import { useRecipients } from "@/hooks/data/use-recipients";
import { useTransfer } from "@/hooks/data/use-transfers";

const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30";
const selectCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30";

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

export function SendMoneyModal({ onClose, prefill }: Props) {
  const [mode, setMode] = useState<Mode>(prefill ? "recipient" : "recipient");

  // Recipient mode state
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("manual");
  const [recipientName, setRecipientName] = useState(prefill?.recipientName ?? "");
  const [recipientIban, setRecipientIban] = useState(prefill?.recipientIban ?? "");
  const [fromAccountId, setFromAccountId] = useState("");
  const [amount, setAmount] = useState(prefill?.amount ?? "");
  const [description, setDescription] = useState("");

  // Own-account mode state
  const [ownFromId, setOwnFromId] = useState("");
  const [ownToId, setOwnToId] = useState("");
  const [ownAmount, setOwnAmount] = useState("");
  const [ownDesc, setOwnDesc] = useState("");

  const { data: accounts = [] } = useAccounts();
  const { data: recipientsPage } = useRecipients(1);
  const recipients = recipientsPage?.data ?? [];

  const { mutate: doTransfer, isPending } = useTransfer();

  function handleRecipientSelect(id: string) {
    setSelectedRecipientId(id);
    if (id !== "manual") {
      const r = recipients.find((r) => r.unid === id);
      if (r) {
        setRecipientName(r.name);
        setRecipientIban(r.iban ?? "");
      }
    } else {
      if (!prefill) {
        setRecipientName("");
        setRecipientIban("");
      }
    }
  }

  function handleSubmitRecipient(e: React.FormEvent) {
    e.preventDefault();
    if (!fromAccountId) {
      toast.error("Select a source account.");
      return;
    }
    if (!recipientName.trim()) {
      toast.error("Recipient name is required.");
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    const recipientId =
      selectedRecipientId !== "manual" ? selectedRecipientId : undefined;

    doTransfer(
      {
        from_account_unid: fromAccountId,
        to_recipient_unid: recipientId ?? null,
        to_account_unid: null,
        amount: amountNum,
        description: description.trim() || null,
        reference: null,
      },
      {
        onSuccess: () => {
          toast.success("Transfer sent.");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleSubmitOwn(e: React.FormEvent) {
    e.preventDefault();
    if (!ownFromId || !ownToId) {
      toast.error("Select both accounts.");
      return;
    }
    if (ownFromId === ownToId) {
      toast.error("Source and destination must differ.");
      return;
    }
    const amountNum = parseFloat(ownAmount);
    if (!ownAmount || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    doTransfer(
      {
        from_account_unid: ownFromId,
        to_recipient_unid: null,
        to_account_unid: ownToId,
        amount: amountNum,
        description: ownDesc.trim() || null,
        reference: null,
      },
      {
        onSuccess: () => {
          toast.success("Transfer complete.");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
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
              <label className={labelCls}>From Account *</label>
              <select
                className={selectCls}
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                required
              >
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a.unid} value={a.unid}>
                    {a.label} — {Number(a.balance).toLocaleString("en-US", { style: "currency", currency: a.currency })}
                  </option>
                ))}
              </select>
            </div>

            {!prefill && recipients.length > 0 && (
              <div>
                <label className={labelCls}>Saved Recipient</label>
                <select
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
              <label className={labelCls}>Recipient Name *</label>
              <input
                className={inputCls}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>

            <div>
              <label className={labelCls}>IBAN (optional)</label>
              <input
                className={inputCls}
                value={recipientIban}
                onChange={(e) => setRecipientIban(e.target.value)}
                placeholder="GB29 NWBK 6016 1331 9268 19"
              />
            </div>

            <div>
              <label className={labelCls}>Amount *</label>
              <input
                className={inputCls}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className={labelCls}>Description (optional)</label>
              <input
                className={inputCls}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Rent payment"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Send
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitOwn} className="space-y-3">
            <div>
              <label className={labelCls}>From Account *</label>
              <select
                className={selectCls}
                value={ownFromId}
                onChange={(e) => setOwnFromId(e.target.value)}
                required
              >
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a.unid} value={a.unid}>
                    {a.label} — {Number(a.balance).toLocaleString("en-US", { style: "currency", currency: a.currency })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>To Account *</label>
              <select
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
                      {a.label} — {Number(a.balance).toLocaleString("en-US", { style: "currency", currency: a.currency })}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Amount *</label>
              <input
                className={inputCls}
                type="number"
                min="0.01"
                step="0.01"
                value={ownAmount}
                onChange={(e) => setOwnAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className={labelCls}>Description (optional)</label>
              <input
                className={inputCls}
                value={ownDesc}
                onChange={(e) => setOwnDesc(e.target.value)}
                placeholder="e.g. Savings top-up"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Transfer
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
