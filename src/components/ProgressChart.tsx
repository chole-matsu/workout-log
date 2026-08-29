import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { colors, radius } from '../theme';

export type ChartPoint = {
  /** YYYY-MM-DD */
  date: string;
  value: number;
};

type Props = {
  points: ChartPoint[];
  /**
   * 描画幅。onLayout は react-native-web で発火しないことがあるため、
   * 呼び出し側が画面幅から計算して渡す。
   */
  width: number;
  /** 値に付ける単位（"kg" など） */
  unit: string;
  height?: number;
};

/** 左端に確保する目盛り用の幅。ここに最高値・最低値を書くので点とぶつからない */
const GUTTER = 46;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 20;

/** "2026-08-24" → "8/24" */
const shortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
};

/** 目盛りに出す数値。整数なら整数のまま、小数なら1桁に丸める */
const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

/**
 * 記録の推移を折れ線で描く。
 * 軸は描かず、上下の値と両端の日付だけを添えた最小限の表示にしている。
 */
export default function ProgressChart({ points, width, unit, height = 150 }: Props) {
  if (points.length === 0 || width <= 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>記録が増えるとグラフが表示されます</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // 全部同じ値だと線が潰れるので、上下に余白を作る
  const pad = rawMax === rawMin ? Math.max(rawMax * 0.1, 1) : (rawMax - rawMin) * 0.15;
  const min = rawMin - pad;
  const max = rawMax + pad;

  const plotLeft = GUTTER;
  const plotRight = width - PAD_RIGHT;
  const plotW = Math.max(plotRight - plotLeft, 1);
  const plotH = height - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) =>
    points.length === 1 ? plotLeft + plotW / 2 : plotLeft + (plotW * i) / (points.length - 1);
  const y = (v: number) => PAD_TOP + plotH * (1 - (v - min) / (max - min));

  const coords = points.map((p, i) => ({ cx: x(i), cy: y(p.value), ...p }));
  const polyline = coords.map((c) => `${c.cx},${c.cy}`).join(' ');
  const last = coords[coords.length - 1];
  // 目盛りと同じ値なら重ねて出さない
  const showLastValue = last.value !== rawMax && last.value !== rawMin;

  return (
    <View style={{ height, width }}>
      <Svg width={width} height={height}>
        {/* 最高値・最低値の位置に薄い補助線を引く */}
        <Line
          x1={plotLeft}
          y1={y(rawMax)}
          x2={plotRight}
          y2={y(rawMax)}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        {rawMax !== rawMin ? (
          <Line
            x1={plotLeft}
            y1={y(rawMin)}
            x2={plotRight}
            y2={y(rawMin)}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ) : null}

        {/* 目盛りは左の余白に、補助線の高さに合わせて置く */}
        <SvgText
          x={GUTTER - 8}
          y={y(rawMax) + 3.5}
          fill={colors.textMuted}
          fontSize={10}
          textAnchor="end"
        >
          {`${fmt(rawMax)}${unit}`}
        </SvgText>
        {rawMax !== rawMin ? (
          <SvgText
            x={GUTTER - 8}
            y={y(rawMin) + 3.5}
            fill={colors.textMuted}
            fontSize={10}
            textAnchor="end"
          >
            {`${fmt(rawMin)}${unit}`}
          </SvgText>
        ) : null}

        {points.length > 1 ? (
          <Polyline
            points={polyline}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {coords.map((c, i) => (
          <Circle
            key={`${c.date}-${i}`}
            cx={c.cx}
            cy={c.cy}
            r={i === coords.length - 1 ? 4.5 : 3}
            fill={i === coords.length - 1 ? colors.accent : colors.surface}
            stroke={colors.accent}
            strokeWidth={2}
          />
        ))}

        {showLastValue ? (
          <SvgText
            x={plotRight}
            y={Math.max(last.cy - 10, 11)}
            fill={colors.accent}
            fontSize={11}
            fontWeight="bold"
            textAnchor="end"
          >
            {`${fmt(last.value)}${unit}`}
          </SvgText>
        ) : null}

        <SvgText x={plotLeft} y={height - 5} fill={colors.textMuted} fontSize={10}>
          {shortDate(points[0].date)}
        </SvgText>
        {points.length > 1 ? (
          <SvgText
            x={plotRight}
            y={height - 5}
            fill={colors.textMuted}
            fontSize={10}
            textAnchor="end"
          >
            {shortDate(points[points.length - 1].date)}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  placeholderText: { color: colors.textMuted, fontSize: 12 },
});
