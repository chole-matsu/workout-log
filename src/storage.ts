import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { PALETTE } from './theme';
import { DEFAULT_SORT, type Exercise, type SortState, type WorkoutRecord } from './types';

const EXERCISES_KEY = 'workout-log/exercises/v1';
const RECORDS_KEY = 'workout-log/records/v1';
const SORT_KEY = 'workout-log/sort/v2';
const PHOTO_DIR_NAME = 'thumbnails';

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** ローカル日付を YYYY-MM-DD で返す（UTC ずれを避けるため toISOString は使わない） */
export function today(): string {
  const d = new Date();
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** 初回起動時に入れておく種目 */
function seedExercises(): Exercise[] {
  const seeds: Array<[string, string]> = [
    ['ベンチプレス', 'weight-lifter'],
    ['スクワット', 'human-handsup'],
    ['デッドリフト', 'weight'],
    ['懸垂', 'gymnastics'],
    ['ショルダープレス', 'dumbbell'],
    ['アームカール', 'arm-flex'],
  ];
  const now = Date.now();
  return seeds.map(([name, icon], i) => ({
    id: newId(),
    name,
    icon,
    color: PALETTE[i % PALETTE.length],
    createdAt: now + i,
  }));
}

export async function loadExercises(): Promise<Exercise[]> {
  const stored = await readJson<Exercise[] | null>(EXERCISES_KEY, null);
  if (stored) return stored;
  const seeded = seedExercises();
  await writeJson(EXERCISES_KEY, seeded);
  return seeded;
}

export async function saveExercises(exercises: Exercise[]): Promise<void> {
  await writeJson(EXERCISES_KEY, exercises);
}

export async function loadRecords(): Promise<WorkoutRecord[]> {
  return readJson<WorkoutRecord[]>(RECORDS_KEY, []);
}

export async function saveRecords(records: WorkoutRecord[]): Promise<void> {
  await writeJson(RECORDS_KEY, records);
}

export async function loadSort(): Promise<SortState> {
  const stored = await readJson<Partial<SortState> | null>(SORT_KEY, null);
  // 保存値が壊れていても落ちないよう、既知の値だけ受け入れる
  const key =
    stored?.key === 'name' || stored?.key === 'recent' || stored?.key === 'added'
      ? stored.key
      : DEFAULT_SORT.key;
  const direction = stored?.direction === 'desc' || stored?.direction === 'asc'
    ? stored.direction
    : DEFAULT_SORT.direction;
  return { key, direction };
}

export async function saveSort(sort: SortState): Promise<void> {
  await writeJson(SORT_KEY, sort);
}

/** Web 用サムネイルの一辺（px）。表示は最大 128px なので 256 あれば足りる */
const WEB_THUMB_SIZE = 256;

/**
 * Web 版の ImagePicker は `blob:` URL を返すが、これはページを閉じると無効になる。
 * canvas で正方形に切り出して縮小し、保存できる data URL に変換する。
 * （元画像のまま base64 化すると localStorage の容量をすぐ使い切ってしまう）
 */
async function toWebThumbnail(sourceUri: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('画像を読み込めませんでした'));
    el.src = sourceUri;
  });

  const canvas = document.createElement('canvas');
  canvas.width = WEB_THUMB_SIZE;
  canvas.height = WEB_THUMB_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas を初期化できませんでした');

  // 中央を正方形に切り出してから縮小する
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, WEB_THUMB_SIZE, WEB_THUMB_SIZE);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  URL.revokeObjectURL(sourceUri);
  return dataUrl;
}

/**
 * ImagePicker が返すのはキャッシュ領域の URI で、OS に削除されることがある。
 * ドキュメント領域へコピーして永続化した URI を返す。
 */
export async function persistPhoto(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    try {
      return await toWebThumbnail(sourceUri);
    } catch (e) {
      console.warn('サムネイル写真の変換に失敗しました', e);
      return sourceUri;
    }
  }

  try {
    const dir = new Directory(Paths.document, PHOTO_DIR_NAME);
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }
    const src = new File(sourceUri);
    const ext = src.extension || '.jpg';
    const dest = new File(dir, `${newId()}${ext}`);
    await src.copy(dest);
    return dest.uri;
  } catch (e) {
    // コピーに失敗しても記録自体は続けられるよう、元の URI で妥協する
    console.warn('サムネイル写真の保存に失敗しました', e);
    return sourceUri;
  }
}

/** 種目の削除などで不要になった写真を消す（失敗しても無視） */
export async function deletePhoto(uri?: string): Promise<void> {
  if (!uri) return;
  // Web の写真は data URL としてレコード内に持っているので、消すファイルは無い
  if (Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // 消せなくても実害はないので無視
  }
}
