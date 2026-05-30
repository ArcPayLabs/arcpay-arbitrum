import os from "node:os";
import path from "node:path";

process.env.ARCPAY_WORKER_ONCE = process.env.ARCPAY_WORKER_ONCE || "true";
process.env.ARCPAY_WORKER_BACKFILL_BLOCKS = process.env.ARCPAY_WORKER_BACKFILL_BLOCKS || "3";
process.env.ARCPAY_WORKER_SCAN_CHUNK = process.env.ARCPAY_WORKER_SCAN_CHUNK || "3";
process.env.ARCPAY_WORKER_CHECKPOINT_PATH =
  process.env.ARCPAY_WORKER_CHECKPOINT_PATH || path.join(os.tmpdir(), `arcpay-arbitrum-worker-once-${Date.now()}.json`);

await import("../apps/worker/src/index.mjs");
