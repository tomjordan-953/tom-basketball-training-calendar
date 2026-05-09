// Prediction tracking store.
// Tries to persist to disk under data/predictions.json. On read-only
// filesystems (e.g. some serverless deployments) it transparently falls back
// to an in-memory store — predictions stay grouped per server instance.
//
// The on-disk format is a flat array. Predictions are deduped by id so that
// re-rendering a profile doesn't write multiple rows for the same projection.

import { promises as fs } from "fs";
import path from "path";
import type { PredictionRecord } from "@/types/tracking";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "predictions.json");

let memory: PredictionRecord[] | null = null;
let writable = true;

async function readFile(): Promise<PredictionRecord[]> {
  if (memory) return memory;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as PredictionRecord[];
    memory = Array.isArray(parsed) ? parsed : [];
  } catch {
    memory = [];
  }
  return memory;
}

async function writeFile(rows: PredictionRecord[]): Promise<void> {
  memory = rows;
  if (!writable) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
  } catch {
    // Read-only filesystem (e.g. Vercel) — keep working from memory.
    writable = false;
  }
}

export async function listPredictions(): Promise<PredictionRecord[]> {
  return [...(await readFile())];
}

export async function listForPlayer(playerId: string): Promise<PredictionRecord[]> {
  return (await readFile()).filter((r) => r.playerId === playerId);
}

export async function recordPrediction(rec: PredictionRecord): Promise<void> {
  const rows = await readFile();
  // Dedupe: keep the latest record for the same player/targetDate combination.
  const existingIdx = rows.findIndex(
    (r) =>
      r.playerId === rec.playerId &&
      (r.targetDate ?? "") === (rec.targetDate ?? "") &&
      !r.actual,
  );
  if (existingIdx >= 0) {
    rows[existingIdx] = { ...rows[existingIdx], ...rec };
  } else if (!rows.some((r) => r.id === rec.id)) {
    rows.unshift(rec);
  }
  // Cap stored predictions so the file never grows unbounded.
  const trimmed = rows.slice(0, 1000);
  await writeFile(trimmed);
}

export async function gradePrediction(
  id: string,
  patch: Partial<PredictionRecord>,
): Promise<void> {
  const rows = await readFile();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], ...patch };
  await writeFile(rows);
}

export function isWritable(): boolean {
  return writable;
}
