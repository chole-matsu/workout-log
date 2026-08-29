import { today } from './storage';
import type { Exercise, SortState, WorkoutRecord, WorkoutSet } from './types';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** "2026-08-24" → "8/24(日)" */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}/${d}(${WEEKDAYS[dt.getDay()]})`;
}

/** "2026-08-24" → "今日" / "昨日" / "3日前" */
export function relativeDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [ty, tm, td] = today().split('-').map(Number);
  const diff = Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86_400_000
  );
  if (diff <= 0) return '今日';
  if (diff === 1) return '昨日';
  if (diff < 30) return `${diff}日前`;
  const months = Math.floor(diff / 30);
  return `${months}ヶ月前`;
}

/** 全セットが同じなら "100kg × 8回 × 3セット"、違えば "100×8 / 100×7 / 95×6" */
export function formatSets(sets: WorkoutSet[]): string {
  if (sets.length === 0) return '記録なし';

  const uniform = sets.every((s) => s.weight === sets[0].weight && s.reps === sets[0].reps);
  if (uniform) {
    const base = `${sets[0].weight}kg × ${sets[0].reps}回`;
    return sets.length > 1 ? `${base} × ${sets.length}セット` : base;
  }
  return sets.map((s) => `${s.weight}×${s.reps}`).join(' / ');
}

/** その種目の最新の記録（無ければ undefined） */
export function latestRecordFor(
  records: WorkoutRecord[],
  exerciseId: string
): WorkoutRecord | undefined {
  let best: WorkoutRecord | undefined;
  for (const r of records) {
    if (r.exerciseId !== exerciseId) continue;
    if (!best || r.date > best.date || (r.date === best.date && r.createdAt > best.createdAt)) {
      best = r;
    }
  }
  return best;
}

/** 総挙上量（kg × 回の合計） */
export function totalVolume(sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/**
 * 一番重いセットだけを短く表す。"92.5kg×8"
 * トップ画面の3列カードには formatSets の全文が入りきらないため使う。
 */
export function formatTopSet(sets: WorkoutSet[]): string {
  if (sets.length === 0) return '';
  const top = sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0]);
  return `${top.weight}kg×${top.reps}`;
}

/** そのセッションで扱った最大重量 */
export function maxWeight(sets: WorkoutSet[]): number {
  return sets.reduce((max, s) => (s.weight > max ? s.weight : max), 0);
}

/** その種目の記録を日付の古い順に返す */
export function recordsForExercise(
  records: WorkoutRecord[],
  exerciseId: string
): WorkoutRecord[] {
  return records
    .filter((r) => r.exerciseId === exerciseId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

/** 追加した順（元の並び） */
const byAdded = (a: Exercise, b: Exercise) => a.createdAt - b.createdAt;

/**
 * 色を 0〜360 の色相に変換する。赤=0、黄=60、緑=120、青=240、紫=300。
 * 彩度が無い色（白・黒・灰）は色相を持たないので、末尾に回すため 361 を返す。
 */
export function hueOf(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 361;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 361;

  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  h *= 60;
  return h < 0 ? h + 360 : h;
}

/**
 * 指定した並び順で種目を並べ替える。元の配列は変更しない。
 * どの基準でも、比較が引き分けたときは追加順に落とす（表示が毎回ぶれないように）。
 */
export function sortExercises(
  exercises: Exercise[],
  records: WorkoutRecord[],
  sort: SortState,
  /** お気に入り順で使う、自分で並べ替えた種目 id の並び */
  customOrder: string[] = []
): Exercise[] {
  const sorted = [...exercises];
  const dir = sort.direction === 'asc' ? 1 : -1;

  if (sort.key === 'custom') {
    // 並びに無い種目（新しく追加したもの）は末尾へ
    const rank = new Map(customOrder.map((id, i) => [id, i]));
    const at = (e: Exercise) => rank.get(e.id) ?? Number.MAX_SAFE_INTEGER;
    sorted.sort((a, b) => dir * (at(a) - at(b)) || byAdded(a, b));
    return sorted;
  }

  if (sort.key === 'color') {
    sorted.sort((a, b) => dir * (hueOf(a.color) - hueOf(b.color)) || byAdded(a, b));
    return sorted;
  }

  if (sort.key === 'name') {
    // 'ja' 指定で ひらがな・カタカナ・漢字・英字が自然な順に並ぶ
    sorted.sort((a, b) => dir * a.name.localeCompare(b.name, 'ja') || byAdded(a, b));
    return sorted;
  }

  if (sort.key === 'recent') {
    const lastDate = new Map<string, string>();
    for (const ex of exercises) {
      const last = latestRecordFor(records, ex.id);
      if (last) lastDate.set(ex.id, last.date);
    }

    sorted.sort((a, b) => {
      const da = lastDate.get(a.id);
      const db = lastDate.get(b.id);
      // 未記録の種目は向きに関わらず常に末尾（先頭に来ても嬉しくないため）
      if (!da && !db) return byAdded(a, b);
      if (!da) return 1;
      if (!db) return -1;
      return dir * da.localeCompare(db) || byAdded(a, b);
    });
    return sorted;
  }

  sorted.sort((a, b) => dir * byAdded(a, b));
  return sorted;
}
