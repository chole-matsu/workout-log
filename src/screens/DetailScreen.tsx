import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDialog } from '../components/DialogProvider';
import ProgressChart, { type ChartPoint } from '../components/ProgressChart';
import Thumbnail from '../components/Thumbnail';
import {
  formatDate,
  formatSets,
  maxWeight,
  recordsForExercise,
  relativeDay,
  totalVolume,
} from '../format';
import { today } from '../storage';
import { colors, radius } from '../theme';
import type { Exercise, WorkoutRecord, WorkoutSet } from '../types';

type Props = {
  exercise: Exercise;
  /** この種目に限らない全記録。画面側で絞り込む */
  records: WorkoutRecord[];
  onBack: () => void;
  onEdit: () => void;
  onSaveToday: (sets: WorkoutSet[], memo: string) => void;
  onUpdateRecord: (recordId: string, sets: WorkoutSet[], memo: string) => void;
  onDeleteRecord: (recordId: string) => void;
};

type SetRow = { key: string; weight: string; reps: string };
type Metric = 'maxWeight' | 'volume';

let rowSeq = 0;
const makeRow = (weight = '', reps = ''): SetRow => ({
  key: `row-${rowSeq++}`,
  weight,
  reps,
});

const rowsFromSets = (sets: WorkoutSet[]): SetRow[] =>
  sets.length > 0 ? sets.map((s) => makeRow(String(s.weight), String(s.reps))) : [makeRow()];

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'maxWeight', label: '最大重量', unit: 'kg' },
  { key: 'volume', label: '総挙上量', unit: 'kg' },
];

/** グラフに出す最大件数。古すぎる記録まで描くと潰れて読めなくなる */
const CHART_LIMIT = 20;

/** scrollContent の左右余白 */
const H_PADDING = 16;
/** chartCard の左右の内側余白と枠線 */
const CHART_CARD_INSET = 4 * 2 + 2;

export default function DetailScreen({
  exercise,
  records,
  onBack,
  onEdit,
  onSaveToday,
  onUpdateRecord,
  onDeleteRecord,
}: Props) {
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const inputSectionY = useRef(0);

  const chartWidth = screenWidth - H_PADDING * 2 - CHART_CARD_INSET;

  // 古い順。グラフはこの順、履歴一覧は逆順で使う
  const history = useMemo(
    () => recordsForExercise(records, exercise.id),
    [records, exercise.id]
  );
  const lastRecord = history.length > 0 ? history[history.length - 1] : undefined;

  /** 編集中の記録 id。null なら「今日の記録」を新規入力している状態 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState<SetRow[]>(() => rowsFromSets(lastRecord?.sets ?? []));
  const [memo, setMemo] = useState('');
  const [metric, setMetric] = useState<Metric>('maxWeight');

  const editingRecord = editingId ? history.find((r) => r.id === editingId) : undefined;

  const chartPoints: ChartPoint[] = useMemo(() => {
    const src = history.slice(-CHART_LIMIT);
    return src.map((r) => ({
      date: r.date,
      value: metric === 'maxWeight' ? maxWeight(r.sets) : totalVolume(r.sets),
    }));
  }, [history, metric]);

  const activeMetric = METRICS.find((m) => m.key === metric)!;

  const updateRow = (key: string, patch: Partial<SetRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => {
      const last = prev[prev.length - 1];
      // 直前のセットの値を引き継ぐと入力が速い
      return [...prev, makeRow(last?.weight ?? '', last?.reps ?? '')];
    });
  };

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  /** 入力欄を「今日の新規記録」の状態に戻す */
  const resetToNew = () => {
    setEditingId(null);
    setRows(rowsFromSets(lastRecord?.sets ?? []));
    setMemo('');
  };

  const startEditing = (record: WorkoutRecord) => {
    setEditingId(record.id);
    setRows(rowsFromSets(record.sets));
    setMemo(record.memo ?? '');
    scrollRef.current?.scrollTo({ y: Math.max(inputSectionY.current - 12, 0), animated: true });
  };

  /** 入力欄を検証して WorkoutSet[] にする。問題があれば null を返して通知する */
  const collectSets = (): WorkoutSet[] | null => {
    const sets: WorkoutSet[] = [];
    for (const r of rows) {
      // 空行はそのまま無視する
      if (r.weight.trim() === '' && r.reps.trim() === '') continue;
      const weight = Number(r.weight.replace(',', '.'));
      const reps = Number(r.reps);
      // 自重種目もあるので weight は 0 を許可
      if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps <= 0) {
        void dialog.alert({
          title: '入力を確認してください',
          message: '重量は0以上の数値、回数は1以上の整数で入力してください。',
        });
        return null;
      }
      sets.push({ weight, reps });
    }
    if (sets.length === 0) {
      void dialog.alert({
        title: '記録がありません',
        message: '重量と回数を入力してください。',
      });
      return null;
    }
    return sets;
  };

  const handleSubmit = () => {
    const sets = collectSets();
    if (!sets) return;

    if (editingId) {
      onUpdateRecord(editingId, sets, memo.trim());
      setEditingId(null);
      setMemo('');
    } else {
      onSaveToday(sets, memo.trim());
      setMemo('');
    }
  };

  const confirmDelete = async (record: WorkoutRecord) => {
    const ok = await dialog.confirm({
      title: `${formatDate(record.date)} の記録を削除しますか？`,
      message: `${formatSets(record.sets)}\n\n元に戻せません。`,
      confirmLabel: '削除する',
      destructive: true,
    });
    if (!ok) return;
    if (editingId === record.id) resetToNew();
    onDeleteRecord(record.id);
  };

  const isEditing = !!editingRecord;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Pressable
          onPress={onEdit}
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="種目を編集"
        >
          <MaterialCommunityIcons name="pencil" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── 前回の記録 ───────────────────────────── */}
        <View style={styles.lastCard}>
          <Thumbnail exercise={exercise} size={72} />
          <View style={styles.lastCardBody}>
            <Text style={styles.lastLabel}>前回の記録</Text>
            {lastRecord ? (
              <>
                <Text style={styles.lastValue}>{formatSets(lastRecord.sets)}</Text>
                <Text style={styles.lastMeta}>
                  {formatDate(lastRecord.date)}・{relativeDay(lastRecord.date)}・総挙上量{' '}
                  {totalVolume(lastRecord.sets).toLocaleString('ja-JP')}kg
                </Text>
                {lastRecord.memo ? (
                  <Text style={styles.lastMemo} numberOfLines={2}>
                    {lastRecord.memo}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.lastEmpty}>まだ記録がありません</Text>
            )}
          </View>
        </View>

        {/* ── 記録の入力（新規 / 編集） ───────────────── */}
        <View onLayout={(e) => (inputSectionY.current = e.nativeEvent.layout.y)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isEditing ? `${formatDate(editingRecord.date)} の記録を編集` : '今回の記録'}
            </Text>
            {isEditing ? (
              <Pressable
                onPress={resetToNew}
                hitSlop={8}
                style={({ pressed }) => [styles.cancelEdit, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
                <Text style={styles.cancelEditLabel}>編集をやめる</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.setsCard, isEditing && styles.setsCardEditing]}>
            <View style={styles.setHeaderRow}>
              <Text style={[styles.setHeaderCell, styles.colIndex]}>セット</Text>
              <Text style={[styles.setHeaderCell, styles.colInput]}>重量 (kg)</Text>
              <Text style={[styles.setHeaderCell, styles.colInput]}>回数</Text>
              <View style={styles.colRemove} />
            </View>

            {rows.map((row, index) => (
              <View key={row.key} style={styles.setRow}>
                <Text style={[styles.setIndex, styles.colIndex]}>{index + 1}</Text>
                <TextInput
                  style={[styles.input, styles.colInput]}
                  value={row.weight}
                  onChangeText={(t) => updateRow(row.key, { weight: t })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  selectTextOnFocus
                  returnKeyType="done"
                />
                <TextInput
                  style={[styles.input, styles.colInput]}
                  value={row.reps}
                  onChangeText={(t) => updateRow(row.key, { reps: t })}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  selectTextOnFocus
                  returnKeyType="done"
                />
                <Pressable
                  onPress={() => removeRow(row.key)}
                  disabled={rows.length <= 1}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.colRemove,
                    styles.removeButton,
                    (pressed || rows.length <= 1) && { opacity: 0.35 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${index + 1}セット目を削除`}
                >
                  <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={addRow}
              style={({ pressed }) => [styles.addSetButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.accent} />
              <Text style={styles.addSetLabel}>セットを追加</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="メモ（フォーム、体調など）"
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="check" size={20} color={colors.bg} />
            <Text style={styles.saveLabel}>{isEditing ? '更新する' : '記録する'}</Text>
          </Pressable>
        </View>

        {/* ── 推移グラフ ───────────────────────────── */}
        {history.length > 0 ? (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>推移</Text>
              <View style={styles.metricRow}>
                {METRICS.map((m) => {
                  const selected = m.key === metric;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setMetric(m.key)}
                      hitSlop={{ top: 8, bottom: 8 }}
                      style={({ pressed }) => [
                        styles.metricChip,
                        selected && styles.metricChipSelected,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[styles.metricLabel, selected && styles.metricLabelSelected]}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.chartCard}>
              <ProgressChart
                points={chartPoints}
                width={chartWidth}
                unit={activeMetric.unit}
              />
            </View>
          </View>
        ) : null}

        {/* ── 履歴一覧 ─────────────────────────────── */}
        {history.length > 0 ? (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>履歴</Text>
              <Text style={styles.sectionCount}>{history.length}件</Text>
            </View>

            <View style={styles.historyCard}>
              {[...history].reverse().map((record, index) => {
                const beingEdited = record.id === editingId;
                return (
                  <View
                    key={record.id}
                    style={[
                      styles.historyRow,
                      index > 0 && styles.historyRowDivider,
                      beingEdited && styles.historyRowEditing,
                    ]}
                  >
                    <Pressable
                      onPress={() => startEditing(record)}
                      style={({ pressed }) => [styles.historyMain, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatDate(record.date)} ${formatSets(record.sets)} を編集`}
                    >
                      <View style={styles.historyDateCol}>
                        <Text style={styles.historyDate}>{formatDate(record.date)}</Text>
                        <Text style={styles.historyWhen}>{relativeDay(record.date)}</Text>
                      </View>
                      <View style={styles.historyBody}>
                        <Text style={styles.historySets} numberOfLines={2}>
                          {formatSets(record.sets)}
                        </Text>
                        <Text style={styles.historyVolume}>
                          最大 {maxWeight(record.sets)}kg・総挙上量{' '}
                          {totalVolume(record.sets).toLocaleString('ja-JP')}kg
                        </Text>
                        {record.memo ? (
                          <Text style={styles.historyMemo} numberOfLines={1}>
                            {record.memo}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => void confirmDelete(record)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.historyDelete, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatDate(record.date)} の記録を削除`}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <Text style={styles.historyHint}>
              行をタップすると、その日の記録を編集できます
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 22,
  },

  lastCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  lastCardBody: { flex: 1, justifyContent: 'center', gap: 3 },
  lastLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lastValue: { color: colors.text, fontSize: 21, fontWeight: '800' },
  lastMeta: { color: colors.textMuted, fontSize: 11 },
  lastMemo: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  lastEmpty: { color: colors.textMuted, fontSize: 16, marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sectionCount: { color: colors.textMuted, fontSize: 12 },
  cancelEdit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelEditLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  setsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  // 編集中はどの記録を触っているか分かるよう枠を強調する
  setsCardEditing: { borderColor: colors.accent },
  setHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setHeaderCell: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setIndex: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  colIndex: { width: 42 },
  colInput: { flex: 1 },
  colRemove: { width: 30 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 10,
  },
  removeButton: { alignItems: 'center', justifyContent: 'center', height: 40 },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    marginTop: 2,
  },
  addSetLabel: { color: colors.accent, fontSize: 14, fontWeight: '700' },

  memoInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    padding: 14,
    minHeight: 72,
    textAlignVertical: 'top',
    marginTop: 12,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    marginTop: 12,
  },
  saveLabel: { color: colors.bg, fontSize: 16, fontWeight: '800' },

  metricRow: { flexDirection: 'row', gap: 6 },
  metricChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  metricChipSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  metricLabelSelected: { color: colors.accent },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  historyRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  historyRowEditing: { backgroundColor: colors.accentSoft },
  historyMain: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 14,
    alignItems: 'center',
  },
  historyDateCol: { width: 66 },
  historyDate: { color: colors.text, fontSize: 13, fontWeight: '700' },
  historyWhen: { color: colors.textMuted, fontSize: 10 },
  historyBody: { flex: 1, gap: 1 },
  historySets: { color: colors.text, fontSize: 14, fontWeight: '600' },
  historyVolume: { color: colors.textMuted, fontSize: 10 },
  historyMemo: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic' },
  historyDelete: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyHint: { color: colors.textMuted, fontSize: 11, marginTop: 6, paddingLeft: 2 },

  pressed: { opacity: 0.65 },
});
