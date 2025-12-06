import { useState } from "react";
import {
  User,
  CreditCard,
  CalendarClock,
  Lock,
  ShieldCheck,
  Camera,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "personal",   label: "Personal Informations",  icon: User,         sub: "View your detail to receiving Money" },
  { key: "debits",     label: "Direct Debits",           icon: CreditCard,   sub: "Setup and manage your direct debit" },
  { key: "scheduled",  label: "Scheduled Transfer",      icon: CalendarClock, sub: "Manage transfers that are due to go on" },
  { key: "security",   label: "Login and Security",      icon: Lock,         sub: "Amet, enim purus, a lobortis at" },
  { key: "privacy",    label: "Data Privacy",            icon: ShieldCheck,  sub: "Amet, lobortis at, a lobortis at" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageAccountDetails() {
  const [activeTab, setActiveTab] = useState("personal");
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex min-h-full gap-6 p-6">
      {/* Left: progress + tab list */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        {/* Profile completion */}
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 p-4 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative h-10 w-10">
              <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none" stroke="white" strokeWidth="3"
                  strokeDasharray="64 36"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">64%</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Complete profile</p>
              <p className="text-[10px] opacity-70">Complete your profile to unlock all features</p>
            </div>
          </div>
          <Button size="sm" className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold text-xs">
            Verify Identity
          </Button>
        </div>

        {/* Tab list */}
        <nav className="flex flex-col gap-1">
          {TABS.map(({ key, label, icon: Icon, sub }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                activeTab === key
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", activeTab === key && "text-blue-600")} />
              <div>
                <p className={cn("text-sm font-medium", activeTab === key ? "text-blue-700 dark:text-blue-400" : "text-foreground")}>
                  {label}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0">
        {activeTab === "personal" ? (
          <PersonalInfoPanel editing={editing} onEdit={() => setEditing(!editing)} />
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground text-sm rounded-xl border">
            Coming soon
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Personal info panel ───────────────────────────────────────────────────────

function PersonalInfoPanel({ editing, onEdit }: { editing: boolean; onEdit: () => void }) {
  return (
    <div className="space-y-6">
      {/* Avatar row */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Personal Informations</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
              AK
            </div>
            <button className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
              <Camera className="h-3 w-3" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Camera className="h-3 w-3" /> Upload new pictures
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full legal first name" value="Alesia" editing={editing} />
        <Field label="Full legal last name"  value="Karapova" editing={editing} />
        <Field label="Date of birth"         value="29th March 1996" editing={editing} />
        <Field label="Phone number"          value="+1 2345 2980 777" editing={editing} />
      </div>

      <div>
        <h3 className="text-base font-semibold mb-4">Personal Address</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Country"     value="United States" editing={editing} />
          <Field label="City"        value="California" editing={editing} />
          <Field label="Address"     value="6391 Elgin St. Celina, Delaware 10299" editing={editing} colSpan />
          <Field label="Postal code" value="23467" editing={editing} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onEdit}
          className={cn(editing ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700", "text-white font-semibold")}
        >
          {editing ? "Save Details" : "Edit Details"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  colSpan,
}: {
  label: string;
  value: string;
  editing: boolean;
  colSpan?: boolean;
}) {
  return (
    <div className={cn(colSpan && "col-span-2")}>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      {editing ? (
        <input
          defaultValue={value}
          className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      ) : (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">{value}</div>
      )}
    </div>
  );
}
