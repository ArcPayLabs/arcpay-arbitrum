"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type AsyncButtonProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly loadingLabel?: string;
  readonly onClick: () => Promise<void> | void;
  readonly onError?: (message: string) => void;
  readonly type?: "button" | "submit";
};

export function AsyncButton({ children, className, disabled, loadingLabel = "Working...", onClick, onError, type = "button" }: AsyncButtonProps) {
  const [pending, setPending] = useState(false);

  async function run() {
    if (pending || disabled) return;
    setPending(true);
    try {
      await onClick();
    } catch (error) {
      const message = friendlyWalletError(error);
      onError?.(message);
      if (!onError) console.warn(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <button type={type} onClick={() => void run()} disabled={disabled || pending} className={`${className ?? ""} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}>
      {pending ? loadingLabel : children}
    </button>
  );
}

export function friendlyWalletError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lowered = raw.toLowerCase();
  if (lowered.includes("user rejected") || lowered.includes("user denied") || lowered.includes("rejected") || lowered.includes("denied")) return "Wallet request cancelled. No transaction was submitted.";
  if (lowered.includes("already pending")) return "A wallet request is already open. Finish or cancel it before starting another.";
  if (lowered.includes("insufficient")) return "Wallet balance is too low for this action.";
  if (lowered.includes("invalid address")) return "Enter a valid wallet address.";
  return raw || "Action failed before completion.";
}
