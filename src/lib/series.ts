import type { Series } from './types';
import { db, live } from './db';

// ── Reactive collection ───────────────────────────────────────────────
export const series = live<Series[]>(() => db.series.toArray(), []);
