import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from './ThemeProvider';

/**
 * アプリで使うアイコンをすべて自前の SVG で描く。
 *
 * 以前は @expo/vector-icons（アイコンフォント）を使っていたが、
 * expo-font のバージョン差でフォントが読み込めず何も表示されないことがあった。
 * SVG なら追加のフォント読み込みが無いので、iOS でも Web でも必ず出る。
 *
 * 図形はすべて 24×24 の座標系で描く。線幅も同じ座標系の値なので、
 * size を変えても見た目の太さの比率は変わらない。
 */

type Glyph = {
  /** 線で描く図形 */
  paths?: string[];
  /** 塗りつぶす図形（面で見せたいもの） */
  filled?: string[];
  /** 線で描く円 [cx, cy, r] */
  circles?: [number, number, number][];
  /** 塗りつぶす円 [cx, cy, r] */
  dots?: [number, number, number][];
  /** 既定より太く／細くしたいときだけ指定 */
  strokeWidth?: number;
};

const GLYPHS = {
  // ── 操作系 ────────────────────────────────
  'chevron-left': { paths: ['M15 4.5 7.5 12l7.5 7.5'], strokeWidth: 2.3 },
  plus: { paths: ['M12 4.5v15', 'M4.5 12h15'], strokeWidth: 2.2 },
  close: { paths: ['M6 6l12 12', 'M18 6 6 18'], strokeWidth: 2.1 },
  check: { paths: ['M4 12.5 9.5 18 20 6.5'], strokeWidth: 2.3 },
  pencil: { paths: ['M4 16.4V20h3.6L19 8.6 15.4 5z', 'M14.2 6.2l3.6 3.6'] },
  trash: {
    paths: ['M4 7h16', 'M9.5 7V4.5h5V7', 'M6.4 7l1 12.5h9.2l1-12.5', 'M10 10.5v6', 'M14 10.5v6'],
  },
  camera: {
    paths: ['M3 8.2h4L8.4 5.6h7.2L17 8.2h4v11.2H3z'],
    circles: [[12, 13.6, 3.2]],
  },
  image: {
    paths: ['M3.2 4.6h17.6v14.8H3.2z', 'M3.2 15.6l5-4.8 4 3.8 3.2-3 5.4 5'],
    dots: [[8.4, 8.6, 1.3]],
  },
  tag: { paths: ['M20.4 13.4 11.6 4.6H4.6v7l8.8 8.8z'], dots: [[8, 8, 1.3]] },
  palette: {
    paths: [
      'M12 3.4c-4.8 0-8.6 3.6-8.6 8.2 0 4.8 3.8 8.4 8.6 8.4 1.5 0 2.4-.9 2.4-2 0-.6-.3-1-.6-1.4-.3-.4-.5-.7-.5-1.2 0-.9.8-1.6 1.7-1.6h1.6c2.5 0 4-1.7 4-4.2 0-3.6-3.6-6.2-8.6-6.2z',
    ],
    dots: [[8.2, 10.4, 1.3], [12, 7.8, 1.3], [15.8, 10, 1.3]],
  },

  // ── 並び替え ───────────────────────────────
  'sort-added': { paths: ['M12 3.5v9', 'M8.4 9.4 12 13l3.6-3.6', 'M4 15.5V20h16v-4.5'] },
  'sort-name': {
    paths: ['M4 6.2h11', 'M4 12h7.5', 'M4 17.8h4.5', 'M18.5 6.5v11', 'M15.6 14.6l2.9 2.9 2.9-2.9'],
  },
  'sort-recent': {
    circles: [[12, 12, 8]],
    paths: ['M12 7.4V12l3.4 2'],
  },
  'sort-color': {
    // 色相を表すしずく。中に小さな円を置いて「色を選ぶ」印にする
    paths: ['M12 3.4c4.2 5.2 6.2 8.1 6.2 10.8a6.2 6.2 0 0 1-12.4 0c0-2.7 2-5.6 6.2-10.8z'],
    dots: [[12, 14.6, 2.2]],
  },
  star: {
    paths: ['M12 3.6l2.7 5.7 6.3.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 10.2l6.3-.9z'],
  },
  'arrow-up': { paths: ['M12 19.5v-15', 'M6.3 10.2 12 4.5l5.7 5.7'], strokeWidth: 2.1 },
  'arrow-down': { paths: ['M12 4.5v15', 'M6.3 13.8 12 19.5l5.7-5.7'], strokeWidth: 2.1 },

  // ── 種目 ─────────────────────────────────
  dumbbell: { paths: ['M2.5 9.5v5', 'M6 6.8v10.4', 'M18 6.8v10.4', 'M21.5 9.5v5', 'M6 12h12'] },
  'weight-lifter': {
    paths: [
      'M3 5.4h18',
      'M6.5 2.8v5.2',
      'M17.5 2.8v5.2',
      'M10.4 11.4 8.6 5.6',
      'M13.6 11.4l1.8-5.8',
      'M12 11.6v4.6',
      'M12 16.2 9.4 21',
      'M12 16.2l2.6 4.8',
    ],
    dots: [[12, 9.4, 1.8]],
  },
  'arm-flex': {
    // 上腕の直線と力こぶの弧で細長い山型を作り、右側を前腕として上へ折り返す
    paths: [
      'M4 19.8v-4.6a2.4 2.4 0 0 1 2.4-2.4h8.6',
      'M6.8 12.8C8 6.4 13.8 6.4 15 12.8',
      'M15 12.8a2.6 2.6 0 0 0 2.6-2.6V6.2',
    ],
    strokeWidth: 2,
  },
  kettlebell: {
    // 取っ手を低く、胴を広くすると南京錠に見えなくなる
    paths: [
      'M9.4 9.4V8.6a2.6 2.6 0 0 1 5.2 0v.8',
      'M9.6 9.9h4.8c3.2 1.5 4.8 5.6 4 10.3H5.6c-.8-4.7.8-8.8 4-10.3z',
    ],
  },
  weight: { circles: [[12, 12, 8], [12, 12, 2.8]] },
  'human-handsup': {
    paths: ['M12 9.4v5.2', 'M12 10 7.8 5.4', 'M12 10l4.2-4.6', 'M12 14.6 9.4 21', 'M12 14.6l2.6 6.4'],
    dots: [[12, 5.4, 2]],
  },
  gymnastics: {
    paths: [
      'M3 4h18',
      'M8.6 4v3.4',
      'M15.4 4v3.4',
      'M8.6 7.4 12 11.4l3.4-4',
      'M12 11.6v4',
      'M12 15.6 10 20.5',
      'M12 15.6l2 4.9',
    ],
    dots: [[12, 9.4, 1.7]],
  },
  yoga: {
    // あぐら。脚は寝かせた三角で、胴と腕が内側に見えるようにする
    paths: [
      'M12 7.8v4.8',
      'M12 9.6 8.2 12.2',
      'M12 9.6l3.8 2.6',
      'M12 12.6 6.2 16.9',
      'M12 12.6l5.8 4.3',
      'M6.2 16.9h11.6',
    ],
    dots: [[12, 5.2, 2]],
  },
  run: {
    paths: ['M14.2 7.6 11 12.2', 'M11 12.2l2 3.8-2.2 4.6', 'M11 12.2 6.6 13.8', 'M13.6 9.2 17.4 11l.6 4.2'],
    dots: [[15.4, 4.6, 1.9]],
  },
  'run-fast': {
    paths: [
      'M15.4 7.8 12.4 12.2',
      'M12.4 12.2l2 3.8-2.2 4.6',
      'M12.4 12.2 8.6 13.6',
      'M14.8 9.4 18.4 11l.6 4.2',
      'M2 9h4',
      'M2.6 13h3',
    ],
    dots: [[16.6, 4.8, 1.9]],
  },
  bike: {
    circles: [[5.6, 16.6, 4.2], [18.4, 16.6, 4.2]],
    paths: ['M5.6 16.6 9.8 8.4h4.4', 'M9.8 8.4 18.4 16.6', 'M13.2 8.4l1.6 5.4', 'M8.2 8.4h3.2'],
  },
  rowing: {
    paths: ['M14 8.2 10.8 12.4', 'M10.8 12.4 7.4 15.4', 'M10.8 12.4l3.2 3.4', 'M3 18.8 21 9.2'],
    dots: [[15.2, 5, 1.8]],
  },
  swim: {
    // 前に伸ばした腕・胴体・水面のうねり
    paths: ['M8.2 8.6 12.4 5.8l3.8 2.6', 'M6.4 11.4h9.4', 'M15.8 11.4l3.4 2.2', 'M2 18c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0'],
    dots: [[6.4, 8.2, 1.9]],
  },
  'jump-rope': {
    // 縄は足の下を通って両脇へ回り込む大きな弧
    paths: [
      'M12 7.6v5',
      'M12 9.4H9.4',
      'M12 9.4h2.6',
      'M12 12.6l-1.9 4.4',
      'M12 12.6l1.9 4.4',
      'M7.6 6.2C3.4 8.8 3 19.6 12 19.6s8.6-10.8 4.4-13.4',
    ],
    dots: [[12, 5.2, 1.9]],
  },
  karate: {
    // 軸足で立ち、もう一方を前に蹴り出した姿。腕を2本描くと人だと分かる
    paths: [
      'M7 7v5',
      'M7 12 5.8 18.6',
      'M7 12l5.8-1.6',
      'M12.8 10.4 18 7.6',
      'M7 8.8l3.6 1.4',
      'M7 8.8 4.2 10.8',
    ],
    dots: [[7, 5, 1.8]],
  },
  'boxing-glove': {
    paths: [
      'M7.4 6.4h5.8a4.6 4.6 0 0 1 4.6 4.6v3.4a3 3 0 0 1-3 3H8.4a3 3 0 0 1-3-3V9.4a3 3 0 0 1 2-3z',
      'M5.6 13.4h12.2',
      'M8.6 17.4v1.4a1.6 1.6 0 0 0 1.6 1.6h4.4a1.6 1.6 0 0 0 1.6-1.6v-1.4',
    ],
  },
  stairs: { paths: ['M2.5 20h4.6v-4h4.6v-4h4.6V8h5.2'] },
  'shoe-sneaker': {
    paths: [
      'M3 16.6v-4.8c0-.7.5-1.2 1.2-1.2h2L9.4 13l3.8.6c3 .5 5.6 1.6 7.8 3.2v1.8c0 .7-.5 1.2-1.2 1.2H4.2c-.7 0-1.2-.5-1.2-1.2z',
      'M6.4 10.6l1.6 3',
    ],
  },
  'heart-pulse': {
    paths: [
      'M12 20.4S3.6 14.8 3.6 9.4a4.4 4.4 0 0 1 8.4-1.8 4.4 4.4 0 0 1 8.4 1.8c0 5.4-8.4 11-8.4 11z',
      'M5.6 11.4h2.8l1.4-2.6 2 4.8 1.4-2.2h4.2',
    ],
  },
  human: {
    paths: ['M12 8.4v6', 'M7.4 10.6h9.2', 'M12 14.4 9.4 20.6', 'M12 14.4l2.6 6.2'],
    dots: [[12, 5.2, 2.1]],
  },
  fire: {
    // 先端が細く、根元がふくらむ炎の輪郭
    paths: [
      'M12 2.8c3 4 5.6 6.6 5.6 10.6a5.6 5.6 0 0 1-11.2 0c0-2 1-3.6 2-5 .3 1.2 1 2 1.9 2.3C10 7.4 11 4.9 12 2.8z',
    ],
  },
  trophy: {
    paths: [
      'M8 3.8h8v5.4a4 4 0 0 1-8 0z',
      'M8 5.4H5.2v1.4a3.2 3.2 0 0 0 3.2 3.2',
      'M16 5.4h2.8v1.4a3.2 3.2 0 0 1-3.2 3.2',
      'M12 13.2v3.2',
      'M9 20.2h6l-.7-3.8H9.7z',
    ],
  },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;

/** 種目のサムネイルに選べるアイコン */
export const EXERCISE_ICON_NAMES = [
  'dumbbell',
  'weight-lifter',
  'arm-flex',
  'kettlebell',
  'weight',
  'human-handsup',
  'gymnastics',
  'yoga',
  'run',
  'run-fast',
  'bike',
  'rowing',
  'swim',
  'jump-rope',
  'karate',
  'boxing-glove',
  'stairs',
  'shoe-sneaker',
  'heart-pulse',
  'human',
  'fire',
  'trophy',
] as const satisfies readonly IconName[];

type Props = {
  name: string;
  size?: number;
  /** 省略するとテーマの標準文字色になる */
  color?: string;
};

export default function Icon({ name, size = 24, color }: Props) {
  const { c } = useTheme();
  // 保存済みのデータが未知の名前を持っていても落ちないようにする
  const glyph: Glyph = (GLYPHS as Record<string, Glyph>)[name] ?? GLYPHS.dumbbell;
  const sw = glyph.strokeWidth ?? 1.8;
  const stroke = color ?? c.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {glyph.filled?.map((d, i) => <Path key={`f${i}`} d={d} fill={stroke} />)}
      {glyph.paths?.map((d, i) => (
        <Path
          key={`p${i}`}
          d={d}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {glyph.circles?.map(([cx, cy, r], i) => (
        <Circle key={`c${i}`} cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={sw} />
      ))}
      {glyph.dots?.map(([cx, cy, r], i) => (
        <Circle key={`d${i}`} cx={cx} cy={cy} r={r} fill={stroke} />
      ))}
    </Svg>
  );
}
