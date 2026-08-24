import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Thumbnail from '../components/Thumbnail';
import { formatDate, formatSets, relativeDay, totalVolume } from '../format';
import { colors, radius } from '../theme';
import type { Exercise, WorkoutRecord, WorkoutSet } from '../types';

type Props = {
  exercise: Exercise;
  /** この種目の最新の記録 */
  lastRecord?: WorkoutRecord;
  onBack: () => void;
  onEdit: () => void;
  onSave: (sets: WorkoutSet[], memo: string) => void;
};

type SetRow = { key: string; weight: string; reps: string };

let rowSeq = 0;
const makeRow = (weight = '', reps = ''): SetRow => ({
  key: `row-${rowSeq++}`,
  weight,
  reps,
});

/** 前回の記録があればそれを初期値にする（同じ重量から始めることが多いため） */
function initialRows(lastRecord?: WorkoutRecord): SetRow[] {
  if (lastRecord && lastRecord.sets.length > 0) {
    return lastRecord.sets.map((s) => makeRow(String(s.weight), String(s.reps)));
  }
  return [makeRow()];
}

export default function DetailScreen({ exercise, lastRecord, onBack, onEdit, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<SetRow[]>(() => initialRows(lastRecord));
  const [memo, setMemo] = useState('');

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

  const handleSave = () => {
    const sets: WorkoutSet[] = [];
    for (const r of rows) {
      const weight = Number(r.weight.replace(',', '.'));
      const reps = Number(r.reps);
      // 空行はそのまま無視する。自重種目もあるので weight は 0 を許可
      if (r.weight.trim() === '' && r.reps.trim() === '') continue;
      if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps <= 0) {
        Alert.alert('入力を確認してください', '重量は0以上の数値、回数は1以上の整数で入力してください。');
        return;
      }
      sets.push({ weight, reps });
    }

    if (sets.length === 0) {
      Alert.alert('記録がありません', '重量と回数を入力してください。');
      return;
    }

    onSave(sets, memo.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
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

        {/* ── 今回の記録 ───────────────────────────── */}
        <Text style={styles.sectionTitle}>今回の記録</Text>

        <View style={styles.setsCard}>
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
          onPress={handleSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="check" size={20} color={colors.bg} />
          <Text style={styles.saveLabel}>記録する</Text>
        </Pressable>
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
    gap: 16,
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

  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: -6,
  },

  setsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
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
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
  },
  saveLabel: { color: colors.bg, fontSize: 16, fontWeight: '800' },

  pressed: { opacity: 0.65 },
});
