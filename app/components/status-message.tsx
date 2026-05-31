"use client";

import { formatAsyncError } from "@/lib/format-error";

export function StatusMessage({
  message,
  error,
}: {
  message?: string;
  error?: string;
}) {
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (message) {
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }

  return null;
}

export function formatPanelError(error: unknown, fallback: string): string {
  return formatAsyncError(error, fallback);
}
