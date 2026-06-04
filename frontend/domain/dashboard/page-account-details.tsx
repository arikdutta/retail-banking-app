import { useState, useRef, useId } from "react";
import {
  User,
  CreditCard,
  CalendarClock,
  Lock,
  ShieldCheck,
  Camera,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProfile, useUpdateProfile } from "@/hooks/data/use-profile";
import type { UpdateProfileRequest } from "@/bindings/UpdateProfileRequest";
import type { UserProfile } from "@/bindings/UserProfile";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "personal",  label: "Personal Informations", icon: User,          sub: "View your detail to receiving Money" },
  { key: "debits",    label: "Direct Debits",          icon: CreditCard,    sub: "Setup and manage your direct debit" },
  { key: "scheduled", label: "Scheduled Transfer",     icon: CalendarClock, sub: "Manage transfers that are due to go on" },
  { key: "security",  label: "Login and Security",     icon: Lock,          sub: "Amet, enim purus, a lobortis at" },
  { key: "privacy",   label: "Data Privacy",           icon: ShieldCheck,   sub: "Amet, lobortis at, a lobortis at" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageAccountDetails() {
  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="flex min-h-full gap-6 p-6">
      {/* Left: progress + tab list */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
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
          <PersonalInfoPanel />
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

function initials(first: string | null, last: string | null): string {
  const f = (first ?? "").trim()[0] ?? "";
  const l = (last ?? "").trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function toInputDate(iso: string | null): string {
  return iso ?? "";
}

function formatDisplayDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function profileToRequest(p: UserProfile | undefined): UpdateProfileRequest {
  return {
    first_name:    p?.first_name    ?? null,
    last_name:     p?.last_name     ?? null,
    date_of_birth: p?.date_of_birth ?? null,
    phone:         p?.phone         ?? null,
    country:       p?.country       ?? null,
    city:          p?.city          ?? null,
    address:       p?.address       ?? null,
    postal_code:   p?.postal_code   ?? null,
    avatar_data:   p?.avatar_data   ?? null,
  };
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const maxSide = 200;
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")); };
    img.src = objectUrl;
  });
}

function PersonalInfoPanel() {
  const { data: profile, isPending } = useProfile();
  const { mutate: saveProfile, isPending: isSaving } = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [form, setForm] = useState<UpdateProfileRequest>({
    first_name: null,
    last_name: null,
    date_of_birth: null,
    phone: null,
    country: null,
    city: null,
    address: null,
    postal_code: null,
    avatar_data: null,
  });

  function startEditing() {
    setForm({
      first_name:    profile?.first_name    ?? null,
      last_name:     profile?.last_name     ?? null,
      date_of_birth: profile?.date_of_birth ?? null,
      phone:         profile?.phone         ?? null,
      country:       profile?.country       ?? null,
      city:          profile?.city          ?? null,
      address:       profile?.address       ?? null,
      postal_code:   profile?.postal_code   ?? null,
      avatar_data:   profile?.avatar_data   ?? null,
    });
    setEditing(true);
  }

  function handleSave() {
    saveProfile(form, {
      onSuccess: () => {
        setEditing(false);
        toast.success("Profile saved!");
      },
      onError: (e) => toast.error(`Failed to save: ${e.message}`),
    });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be picked again later
    e.target.value = "";
    let b64: string;
    try {
      b64 = await compressImage(file);
    } catch {
      toast.error("Could not read image");
      return;
    }
    setAvatarPreview(b64);
    saveProfile(
      { ...profileToRequest(profile), avatar_data: b64 },
      {
        onSuccess: () => {
          toast.success("Profile picture updated");
          // Keep preview in sync with what was just saved (form may be open)
          setForm((prev) => ({ ...prev, avatar_data: b64 }));
        },
        onError: () => {
          setAvatarPreview(null);
          toast.error("Failed to update picture");
        },
      },
    );
  }

  function handleDeleteAvatar() {
    setAvatarPreview(null);
    saveProfile(
      { ...profileToRequest(profile), avatar_data: null },
      {
        onSuccess: () => {
          toast.success("Profile picture removed");
          setForm((prev) => ({ ...prev, avatar_data: null }));
        },
        onError: () => toast.error("Failed to remove picture"),
      },
    );
  }

  function set(key: keyof UpdateProfileRequest) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value || null }));
  }

  const avatarSrc = avatarPreview ?? profile?.avatar_data ?? null;

  if (isPending) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="flex gap-4">
          <div className="h-16 w-16 rounded-full bg-muted" />
          <div className="flex gap-2 items-center">
            <div className="h-8 w-36 rounded bg-muted" />
            <div className="h-8 w-20 rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-9 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar row */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Personal Informations</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                {initials(profile?.first_name ?? null, profile?.last_name ?? null)}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving}
            >
              <Camera className="h-3 w-3" /> Upload new pictures
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={handleDeleteAvatar}
              disabled={isSaving || (!profile?.avatar_data && !avatarPreview)}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Full legal first name"
          displayValue={profile?.first_name ?? "—"}
          inputValue={form.first_name ?? ""}
          editing={editing}
          onChange={set("first_name")}
        />
        <Field
          label="Full legal last name"
          displayValue={profile?.last_name ?? "—"}
          inputValue={form.last_name ?? ""}
          editing={editing}
          onChange={set("last_name")}
        />
        <Field
          label="Date of birth"
          displayValue={formatDisplayDate(profile?.date_of_birth ?? null)}
          inputValue={toInputDate(form.date_of_birth)}
          inputType="date"
          editing={editing}
          onChange={set("date_of_birth")}
        />
        <Field
          label="Phone number"
          displayValue={profile?.phone ?? "—"}
          inputValue={form.phone ?? ""}
          editing={editing}
          onChange={set("phone")}
        />
      </div>

      <div>
        <h3 className="text-base font-semibold mb-4">Personal Address</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Country"
            displayValue={profile?.country ?? "—"}
            inputValue={form.country ?? ""}
            editing={editing}
            onChange={set("country")}
          />
          <Field
            label="City"
            displayValue={profile?.city ?? "—"}
            inputValue={form.city ?? ""}
            editing={editing}
            onChange={set("city")}
          />
          <Field
            label="Address"
            displayValue={profile?.address ?? "—"}
            inputValue={form.address ?? ""}
            editing={editing}
            onChange={set("address")}
            colSpan
          />
          <Field
            label="Postal code"
            displayValue={profile?.postal_code ?? "—"}
            inputValue={form.postal_code ?? ""}
            editing={editing}
            onChange={set("postal_code")}
          />
        </div>
      </div>

      <div className="flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSaving ? "Saving…" : "Save Details"}
            </Button>
          </div>
        ) : (
          <Button
            onClick={startEditing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Edit Details
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  displayValue,
  inputValue,
  inputType = "text",
  editing,
  onChange,
  colSpan,
}: {
  label: string;
  displayValue: string;
  inputValue: string;
  inputType?: string;
  editing: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  colSpan?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn(colSpan && "col-span-2")}>
      {editing ? (
        <>
          <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">{label}</label>
          <input
            id={id}
            type={inputType}
            value={inputValue}
            onChange={onChange}
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </>
      ) : (
        <>
          <p className="mb-1 text-xs text-muted-foreground">{label}</p>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">{displayValue}</div>
        </>
      )}
    </div>
  );
}
