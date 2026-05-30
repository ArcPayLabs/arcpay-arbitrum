import { useNetwork, type NetworkMode } from "@/store/network";

export function NetworkBadge({ mode, size = "sm" }: { mode?: NetworkMode; size?: "sm" | "md" }) {
  const current = useNetwork((s) => s.mode);
  const m = mode ?? current;
  const cls = size === "md" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-warning/20 font-medium text-foreground ${cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
      Arbitrum Sepolia
    </span>
  );
}
