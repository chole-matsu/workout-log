import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DraggableGrid from '../components/DraggableGrid';
import Icon from '../components/Icon';
import Thumbnail from '../components/Thumbnail';
import { formatTopSet, latestRecordFor, relativeDay, sortExercises } from '../format';
import { useTheme, useThemedStyles } from '../components/ThemeProvider';
import { layout, radius, type Palette } from '../theme';
import { SORT_OPTIONS, type Exercise, type SortState, type WorkoutRecord } from '../types';

type Props = {
  exercises: Exercise[];
  records: WorkoutRecord[];
  sort: SortState;
  onChangeSort: (sort: SortState) => void;
  onOpen: (exerciseId: string) => void;
  onAdd: () => void;
  onOpenTheme: () => void;
  /** お気に入り順の並び（種目 id の配列） */
  customOrder: string[];
  onChangeCustomOrder: (ids: string[]) => void;
};

const COLUMNS = 3;
const GAP = 10;
const H_PADDING = layout.gutter;
const CARD_PADDING = 8;
/** 種目名の表示行数。全カードでこの高さを確保して、行内の高さを揃える */
const NAME_LINES = 2;
const NAME_LINE_HEIGHT = 15;
const SUMMARY_LINE_HEIGHT = 14;
const META_LINE_HEIGHT = 12;

/**
 * カードの高さ。ドラッグでの並べ替えはタイルを絶対配置するため、
 * 高さが中身任せだと位置を計算できない。各行の高さを固定して足し上げる。
 */
const cardHeightFor = (thumbSize: number) =>
  CARD_PADDING * 2 + // 上下の内側余白
  thumbSize +
  7 + // サムネイルと名前のあいだ
  NAME_LINE_HEIGHT * NAME_LINES +
  3 +
  SUMMARY_LINE_HEIGHT +
  1 +
  META_LINE_HEIGHT +
  2; // 枠線

export default function HomeScreen({
  exercises,
  records,
  sort,
  onChangeSort,
  onOpen,
  onAdd,
  onOpenTheme,
  customOrder,
  onChangeCustomOrder,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [dragging, setDragging] = useState(false);

  // 画面幅から左右余白と列間のすき間を引いて、1枚あたりの幅を出す。
  // 初回レイアウトでは width が 0 で来ることがあるので下限を設ける
  // （負の値を渡すとサムネイルの SVG が描画に失敗する）
  const cardWidth = Math.max(Math.floor((width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS), 60);
  const thumbSize = cardWidth - CARD_PADDING * 2;
  const cardHeight = cardHeightFor(thumbSize);

  const sorted = useMemo(
    () => sortExercises(exercises, records, sort, customOrder),
    [exercises, records, sort, customOrder]
  );

  const isDraggable = SORT_OPTIONS.find((o) => o.key === sort.key)?.draggable === true;

  const summaries = useMemo(() => {
    const map = new Map<string, { top: string; meta: string } | null>();
    for (const ex of exercises) {
      const last = latestRecordFor(records, ex.id);
      map.set(
        ex.id,
        last
          ? {
              top: formatTopSet(last.sets),
              meta: `${last.sets.length}セット・${relativeDay(last.date)}`,
            }
          : null
      );
    }
    return map;
  }, [exercises, records]);

  /** 選択中のチップをもう一度押したら昇順⇄降順を入れ替える */
  const handleSortPress = (key: SortState['key']) => {
    if (key === sort.key) {
      onChangeSort({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
      return;
    }
    const option = SORT_OPTIONS.find((o) => o.key === key)!;
    onChangeSort({ key, direction: option.defaultDirection });
  };

  const activeOption = SORT_OPTIONS.find((o) => o.key === sort.key)!;
  const directionLabel =
    sort.direction === 'asc' ? activeOption.ascLabel : activeOption.descLabel;

  /** カードの中身。ドラッグ用グリッドと通常グリッドで共通に使う */
  const renderCard = (item: Exercise, isDragging: boolean) => {
    const summary = summaries.get(item.id);
    return (
      <View
        style={[styles.card, isDragging && styles.cardDragging]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}${summary ? `、前回 ${summary.top}` : '、記録なし'}`}
      >
        <Thumbnail exercise={item} size={thumbSize} borderRadius={radius.md} />
        {/* 名前の高さを固定して、名前が1行でも2行でもカードの高さを揃える */}
        <View style={styles.cardNameBox}>
          <Text style={styles.cardName} numberOfLines={NAME_LINES}>
            {item.name}
          </Text>
        </View>
        <Text
          style={[styles.cardSummary, !summary && styles.cardSummaryEmpty]}
          numberOfLines={1}
        >
          {summary ? summary.top : '記録なし'}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {summary ? summary.meta : ' '}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.title}>筋トレ記録</Text>
          <Text style={styles.subtitle}>
            {exercises.length > 0 ? `${exercises.length} 種目` : 'まずは種目を追加しましょう'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={onOpenTheme}
            hitSlop={10}
            style={({ pressed }) => [styles.themeButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="テーマを変える"
          >
            <Icon name="palette" size={22} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={onAdd}
            hitSlop={10}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="種目を追加"
          >
            <Icon name="plus" size={26} color={c.onAccent} />
          </Pressable>
        </View>
      </View>

      {exercises.length > 0 ? (
        <View style={styles.sortSection}>
          {/* 選択肢が5つあり画面幅に収まらないので横スクロールにする */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortRow}
          >
            {SORT_OPTIONS.map(({ key, label, icon }) => {
              const selected = key === sort.key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handleSortPress(key)}
                  // 見た目は小さく保ちつつ、指で押せる大きさ（44pt 相当）を確保する
                  hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
                  style={({ pressed }) => [
                    styles.sortChip,
                    selected && styles.sortChipSelected,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={
                    selected
                      ? `並び替え ${label} ${directionLabel}。もう一度押すと逆順`
                      : `並び替えを ${label} にする`
                  }
                >
                  <Icon
                    name={icon}
                    size={14}
                    color={selected ? c.accent : c.textMuted}
                  />
                  <Text style={[styles.sortChipLabel, selected && styles.sortChipLabelSelected]}>
                    {label}
                  </Text>
                  {selected ? (
                    <Icon
                      name={sort.direction === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={13}
                      color={c.accent}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.sortHint}>
            {isDraggable ? 'タイルを長押しして動かすと並べ替えられます' : directionLabel}
          </Text>
        </View>
      ) : null}

      {exercises.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="dumbbell" size={52} color={c.border} />
          <Text style={styles.emptyTitle}>種目がありません</Text>
          <Text style={styles.emptyBody}>
            右上の ＋ から種目を追加してください。{'\n'}
            アイコンか、自分で撮った写真をサムネイルにできます。
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          // ドラッグ中に画面が動くと狙った位置に置けないので、そのあいだは止める
          scrollEnabled={!dragging}
        >
          {isDraggable ? (
            // お気に入り順のときだけドラッグできるグリッドを使う。
            // 他の並び順では、実績のある Pressable のままにしておく。
            <DraggableGrid
              items={sorted}
              keyOf={(item) => item.id}
              onPressItem={(item) => onOpen(item.id)}
              onReorder={(ids) => {
                setDragging(false);
                onChangeCustomOrder(ids);
              }}
              onDragStart={() => setDragging(true)}
              draggable
              columns={COLUMNS}
              gap={GAP}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              renderItem={(item, isDragging) => renderCard(item, isDragging)}
            />
          ) : (
            <View style={styles.grid}>
              {sorted.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => onOpen(item.id)}
                  style={({ pressed }) => [
                    { width: cardWidth, height: cardHeight },
                    pressed && styles.pressed,
                  ]}
                >
                  {renderCard(item, false)}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
    paddingBottom: 14,
  },
  headerTextGroup: { gap: 2, flex: 1, minWidth: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: c.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: { color: c.textMuted, fontSize: 13 },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sortSection: {
    paddingBottom: 12,
    gap: 5,
  },
  // 横スクロールの中身なので、余白はここで持たせる
  sortRow: { flexDirection: 'row', gap: 7, paddingHorizontal: H_PADDING },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  sortChipSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  sortChipLabel: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  sortChipLabelSelected: { color: c.accent },
  sortHint: { color: c.textMuted, fontSize: 11, paddingLeft: 2 },

  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 24,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  card: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: CARD_PADDING,
  },
  // 掴んでいるタイルは浮かせて、どれを動かしているか分かるようにする
  cardDragging: {
    borderColor: c.accent,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardNameBox: { height: NAME_LINE_HEIGHT * NAME_LINES, marginTop: 7, justifyContent: 'flex-start' },
  cardName: {
    color: c.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: NAME_LINE_HEIGHT,
  },
  cardSummary: {
    color: c.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: SUMMARY_LINE_HEIGHT,
  },
  cardSummaryEmpty: { color: c.textMuted, fontWeight: '500' },
  cardMeta: { color: c.textMuted, fontSize: 9, marginTop: 1, lineHeight: META_LINE_HEIGHT },
  pressed: { opacity: 0.65 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: { color: c.text, fontSize: 17, fontWeight: '700' },
  emptyBody: {
    color: c.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
