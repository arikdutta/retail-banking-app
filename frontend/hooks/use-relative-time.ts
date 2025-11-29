"use client";

import { useState, useEffect } from "react";

export const DEPLOY_TIME = new Date(Date.now() - 1000 * 60 * 4); // 4 minutes ago
export const JOIN_TIME = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago

export function formatRelative(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function useRelativeTime(date: Date): string {
  const [label, setLabel] = useState(() => formatRelative(date));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatRelative(date)), 30_000);
    return () => clearInterval(id);
  }, [date]);
  return label;
}
