import { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
};

const COLUMNS = 3;
const GAP = 10;
const H_PADDING = layout.gutter;
const CARD_PADDING = 8;
/** 種目名の表示行数。全カードでこの高さを確保して、行内の高さを揃える */
const NAME_LINES = 2;
const NAME_LINE_HEIGHT = 15;

export default function HomeScreen({
  exercises,
  records,
  sort,
  onChangeSort,
  onOpen,
  onAdd,
  onOpenTheme,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // 画面幅から左右余白と列間のすき間を引いて、1枚あたりの幅を出す。
  // 初回レイアウトでは width が 0 で来ることがあるので下限を設ける
  // （負の値を渡すとサムネイルの SVG が描画に失敗する）
  const cardWidth = Math.max(Math.floor((width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS), 60);
  const thumbSize = cardWidth - CARD_PADDING * 2;

  const sorted = useMemo(
    () => sortExercises(exercises, records, sort),
    [exercises, records, sort]
  );

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
          <View style={styles.sortRow}>
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
          </View>
          <Text style={styles.sortHint}>{directionLabel}</Text>
        </View>
      ) : null}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.listContent,
          exercises.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="dumbbell" size={52} color={c.border} />
            <Text style={styles.emptyTitle}>種目がありません</Text>
            <Text style={styles.emptyBody}>
              右上の ＋ から種目を追加してください。{'\n'}
              アイコンか、自分で撮った写真をサムネイルにできます。
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const summary = summaries.get(item.id);
          return (
            <Pressable
              onPress={() => onOpen(item.id)}
              style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
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
            </Pressable>
          );
        }}
      />
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
    paddingHorizontal: H_PADDING,
    paddingBottom: 12,
    gap: 5,
  },
  sortRow: { flexDirection: 'row', gap: 7 },
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

  column: { gap: GAP },
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 24,
    gap: GAP,
  },
  listContentEmpty: { flexGrow: 1 },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: CARD_PADDING,
    gap: 1,
  },
  cardNameBox: { height: NAME_LINE_HEIGHT * NAME_LINES, marginTop: 7, justifyContent: 'flex-start' },
  cardName: {
    color: c.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: NAME_LINE_HEIGHT,
  },
  cardSummary: { color: c.accent, fontSize: 11, fontWeight: '700', marginTop: 3 },
  cardSummaryEmpty: { color: c.textMuted, fontWeight: '500' },
  cardMeta: { color: c.textMuted, fontSize: 9, marginTop: 1 },
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
