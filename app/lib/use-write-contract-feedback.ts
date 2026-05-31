"use client";

import { useEffect, useState } from "react";
import type { Hash } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatTxError } from "@/lib/format-error";

export function useWriteContractFeedback(options?: { onSuccess?: () => void }) {
  const { writeContract, data: txHash, isPending, isError, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const onSuccess = options?.onSuccess;

  const isConfirming = receipt.isLoading;
  const isBusy = isPending || isConfirming;
  const txError = isError ? error : receipt.isError ? receipt.error : undefined;

  useEffect(() => {
    if (txError) {
      setErrorMessage(formatTxError(txError));
    }
  }, [txError]);

  useEffect(() => {
    if (receipt.isSuccess) {
      setStatus("Transaction confirmed.");
      setErrorMessage("");
      onSuccess?.();
    }
  }, [onSuccess, receipt.isSuccess]);

  function setPendingStatus(message: string) {
    setStatus(message);
    setErrorMessage("");
  }

  return {
    writeContract,
    txHash: txHash as Hash | undefined,
    isPending,
    isConfirming,
    isBusy,
    isSuccess: receipt.isSuccess,
    status,
    errorMessage,
    setPendingStatus,
    clearFeedback: () => {
      setStatus("");
      setErrorMessage("");
    },
  };
}
