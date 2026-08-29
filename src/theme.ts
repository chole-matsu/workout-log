export type ThemeName = 'dark' | 'light';

/** 画面で使う色の一式。テーマごとにこの形で用意する */
export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  /** 記録するボタンなど、アクセント色の上に乗せる文字色 */
  onAccent: string;
  /** ステータスバーの文字色 */
  statusBar: 'light' | 'dark';
};

const dark: Palette = {
  bg: '#0E1116',
  surface: '#181D25',
  surfaceAlt: '#212832',
  border: '#2C3542',
  text: '#F2F5F9',
  textMuted: '#8A97A8',
  accent: '#FF6B35',
  accentSoft: 'rgba(255, 107, 53, 0.16)',
  success: '#3DDC91',
  danger: '#FF5A5F',
  onAccent: '#0E1116',
  statusBar: 'light',
};

/**
 * 白ベースのテーマ。
 * 紙のような温かみのある白地に、深めのローズを差し色にしている。
 * 淡いピンクを大きな面に使うと文字が読みにくくなるので、
 * 差し色は濃く取り、面はほぼ白のまま保つ。
 */
const light: Palette = {
  bg: '#FBF7F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F4EEF1',
  border: '#E7DCE2',
  text: '#2A2028',
  textMuted: '#8C7C86',
  accent: '#C2557A',
  accentSoft: 'rgba(194, 85, 122, 0.12)',
  success: '#3E9E7E',
  danger: '#D0455C',
  onAccent: '#FFFFFF',
  statusBar: 'dark',
};

/** サムネイルのアクセントカラー候補。テーマごとに背景に映える組み合わせにする */
const darkExerciseColors = [
  '#FF6B35',
  '#F7B32B',
  '#3DDC91',
  '#2EC4B6',
  '#4EA8DE',
  '#B983FF',
  '#E85D9E',
  '#FF5A5F',
];

const lightExerciseColors = [
  '#C2557A',
  '#C2703A',
  '#3E8F6E',
  '#2F7F8C',
  '#3A6EA5',
  '#7A5AA8',
  '#A84E86',
  '#C04A4A',
];

export const THEMES: Record<
  ThemeName,
  { label: string; description: string; palette: Palette; exerciseColors: string[] }
> = {
  dark: {
    label: 'ナイト',
    description: '黒地にオレンジ',
    palette: dark,
    exerciseColors: darkExerciseColors,
  },
  light: {
    label: 'デイライト',
    description: '白地にローズ',
    palette: light,
    exerciseColors: lightExerciseColors,
  },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const DEFAULT_THEME: ThemeName = 'dark';

/**
 * 種目ごとの色は保存済みのデータに入っている。
 * 暗い背景向けに選ばれた明るい色は白地だと薄すぎるので、明るいテーマでは暗く寄せる。
 */
export function readableOn(hex: string, theme: ThemeName): string {
  if (theme !== 'light') return hex;

  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;

  // 明るい色ほど強く暗くする。十分濃い色はそのまま使う
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < 0.42) return hex;
  const k = luminance > 0.7 ? 0.62 : 0.76;

  const to = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
};

export const layout = {
  /** 画面左右の余白。全画面でこの値に揃える */
  gutter: 16,
  /**
   * ヘッダーのアイコンボタンに掛ける負のマージン。
   * ボタンの当たり判定は大きいまま、アイコンの見た目の位置を gutter に合わせる。
   */
  headerIconOffset: -8,
};

/** 標準バナー広告の高さ */
export const AD_BANNER_HEIGHT = 50;
