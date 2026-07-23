import type { Series, SeriesEntry } from './types';
import { db, live } from './db';

// ── Reactive collections ──────────────────────────────────────────────
export const series = live<Series[]>(() => db.series.toArray(), []);
export const seriesEntries = live<SeriesEntry[]>(() => db.seriesEntries.toArray(), []);
