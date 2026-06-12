"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─── Validation ───────────────────────────────────────────────────────────────

export const dateRangeSchema = z
  .object({
    from: z.date({ required_error: "Start date required" }),
    to:   z.date({ required_error: "End date required" }),
  })
  .refine((d) => d.from <= d.to, {
    message: "End date must be on or after start date",
    path: ["to"],
  })
  .refine((d) => d.to <= new Date(), {
    message: "End date cannot be in the future",
    path: ["to"],
  });

export type DateRangeValue = z.infer<typeof dateRangeSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  error?: string | undefined;
  className?: string;
  placeholder?: string;
}

export function DateRangePicker({
  value,
  onChange,
  error,
  className,
  placeholder = "Pick a date range",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const label = value?.from
    ? value.to
      ? `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`
      : format(value.from, "MMM d, yyyy")
    : placeholder;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9 justify-start gap-2 px-3 text-sm font-normal",
              !value?.from && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={value}
            onSelect={(range) => {
              onChange(range);
              if (range?.from && range?.to) setOpen(false);
            }}
            disabled={{ after: new Date() }}
            defaultMonth={value?.from ?? new Date()}
            numberOfMonths={2}
          />
          {value?.from || value?.to ? (
            <div className="border-t p-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => { onChange(undefined); setOpen(false); }}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
