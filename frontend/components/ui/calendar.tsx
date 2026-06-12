"use client";

import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months:          "flex flex-col sm:flex-row gap-2",
        month:           "flex flex-col gap-4",
        month_caption:   "flex justify-center items-center h-7 relative",
        caption_label:   "text-sm font-medium",
        nav:             "flex items-center gap-1",
        button_previous: cn(
          "absolute left-1 h-7 w-7 rounded-md border border-input bg-transparent p-0",
          "inline-flex items-center justify-center text-muted-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "disabled:pointer-events-none disabled:opacity-50",
        ),
        button_next: cn(
          "absolute right-1 h-7 w-7 rounded-md border border-input bg-transparent p-0",
          "inline-flex items-center justify-center text-muted-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "disabled:pointer-events-none disabled:opacity-50",
        ),
        month_grid:  "w-full border-collapse",
        weekdays:    "flex",
        weekday:     "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        week:        "flex w-full mt-2",
        day:         "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        day_button:  cn(
          "h-8 w-8 rounded-md p-0 font-normal text-sm",
          "inline-flex items-center justify-center",
          "hover:bg-accent hover:text-accent-foreground",
          "aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ),
        range_start:  "day-range-start",
        range_end:    "day-range-end",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        today:        "bg-accent text-accent-foreground",
        outside:      "day-outside text-muted-foreground opacity-50",
        disabled:     "text-muted-foreground opacity-50",
        hidden:       "invisible",
        selected:     "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left"
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
