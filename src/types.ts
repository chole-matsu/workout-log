/** MaterialCommunityIcons のグリフ名 */
export type ExerciseIcon = string;

export type Exercise = {
  id: string;
  name: string;
  /** photoUri が無いときに表示するアイコン */
  icon: ExerciseIcon;
  /** 自分で撮影・選択した写真。あればアイコンより優先される */
  photoUri?: string;
  /** アイコン表示時のアクセントカラー */
  color: string;
  createdAt: number;
};

export type WorkoutSet = {
  /** kg */
  weight: number;
  /** 回 */
  reps: number;
};

export type WorkoutRecord = {
  id: string;
  exerciseId: string;
  /** YYYY-MM-DD */
  date: string;
  sets: WorkoutSet[];
  memo?: string;
  createdAt: number;
};

/**
 * トップ画面の並び替えの基準。
 * - added:  追加した順（既定。タイルの位置が動かない）
 * - name:   種目名
 * - recent: 最後に記録した日
 */
export type SortKey = 'added' | 'name' | 'recent';

export type SortDirection = 'asc' | 'desc';

export type SortState = {
  key: SortKey;
  direction: SortDirection;
};

export const DEFAULT_SORT: SortState = { key: 'added', direction: 'asc' };

export const SORT_OPTIONS: {
  key: SortKey;
  label: string;
  icon: string;
  /** 別の基準に切り替えたときに最初に使う向き */
  defaultDirection: SortDirection;
  /** 向きを説明する文言（チップに表示する） */
  ascLabel: string;
  descLabel: string;
}[] = [
  {
    key: 'added',
    label: '追加順',
    icon: 'sort-added',
    defaultDirection: 'asc',
    ascLabel: '古い→新しい',
    descLabel: '新しい→古い',
  },
  {
    key: 'name',
    label: '名前順',
    icon: 'sort-name',
    defaultDirection: 'asc',
    ascLabel: 'A→Z',
    descLabel: 'Z→A',
  },
  {
    key: 'recent',
    label: '更新順',
    icon: 'sort-recent',
    // 「最近やった種目を先頭に」が自然なので、更新順だけ既定が降順
    defaultDirection: 'desc',
    ascLabel: '古い→新しい',
    descLabel: '新しい→古い',
  },
];
