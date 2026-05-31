export function formatTxError(error: unknown): string {
  if (!error) {
    return "";
  }

  if (error instanceof Error) {
    const message = error.message;

    if (message.includes("User rejected")) {
      return "Transaction rejected in wallet.";
    }

    if (message.includes("insufficient funds")) {
      return "Insufficient funds for gas or purchase amount.";
    }

    const revertMatch = message.match(/reverted(?: with reason(?: string)?)?(?::|\s)['"]?([^'"\n]+)/i);
    if (revertMatch?.[1]) {
      return `Transaction reverted: ${revertMatch[1]}`;
    }

    return message.length > 180 ? `${message.slice(0, 180)}...` : message;
  }

  return "Unexpected transaction error.";
}

export function formatAsyncError(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
