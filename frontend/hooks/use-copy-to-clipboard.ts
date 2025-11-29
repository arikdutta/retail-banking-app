"use client";

import { useState } from "react";

export function useCopyToClipboard(timeout = 1500) {
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  };

  return { copied, copy };
}
