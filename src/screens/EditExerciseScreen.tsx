import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
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

import Icon from '../components/Icon';
import { useDialog } from '../components/DialogProvider';
import Thumbnail from '../components/Thumbnail';
import { EXERCISE_ICONS } from '../icons';
import { persistPhoto } from '../storage';
import { colors, layout, PALETTE, radius } from '../theme';

import type { Exercise } from '../types';

const ICON_COLUMNS = 5;
const ICON_GAP = 10;

export type ExerciseDraft = {
  name: string;
  icon: string;
  photoUri?: string;
  color: string;
};

type Props = {
  /** 未指定なら新規追加 */
  exercise?: Exercise;
  onCancel: () => void;
  onSubmit: (draft: ExerciseDraft) => void;
  onDelete?: () => void;
};

export default function EditExerciseScreen({ exercise, onCancel, onSubmit, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const { width: screenWidth } = useWindowDimensions();
  const isNew = !exercise;

  // 固定サイズだと右側に余白が残るので、画面幅から1マスの大きさを出す。
  // 初回レイアウトでは画面幅が 0 で来ることがあり、そのままだと負の値になって
  // SVG が「幅が負」で描画に失敗するため下限を設ける。
  const iconCellSize = Math.max(
    Math.floor((screenWidth - layout.gutter * 2 - ICON_GAP * (ICON_COLUMNS - 1)) / ICON_COLUMNS),
    24
  );

  const [name, setName] = useState(exercise?.name ?? '');
  const [icon, setIcon] = useState<string>(exercise?.icon ?? EXERCISE_ICONS[0]);
  const [photoUri, setPhotoUri] = useState<string | undefined>(exercise?.photoUri);
  const [color, setColor] = useState(exercise?.color ?? PALETTE[0]);
  const [saving, setSaving] = useState(false);

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      await dialog.alert({
        title: 'カメラを使えません',
        message: 'iPhone の「設定」→ このアプリ → カメラ をオンにしてください。',
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      await dialog.alert({
        title: '写真にアクセスできません',
        message: 'iPhone の「設定」→ このアプリ → 写真 を許可してください。',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      await dialog.alert({
        title: '種目名が空です',
        message: '種目の名前を入力してください。',
      });
      return;
    }

    setSaving(true);
    try {
      let finalPhoto = photoUri;
      // 新しく選んだ写真だけ永続化する（既存のものは既にコピー済み）
      if (photoUri && photoUri !== exercise?.photoUri) {
        finalPhoto = await persistPhoto(photoUri);
      }
      onSubmit({ name: trimmed, icon, photoUri: finalPhoto, color });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!onDelete) return;
    const ok = await dialog.confirm({
      title: `「${exercise?.name}」を削除しますか？`,
      message: 'この種目の記録もすべて削除されます。元に戻せません。',
      confirmLabel: '削除する',
      destructive: true,
    });
    if (ok) onDelete();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onCancel}
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="キャンセル"
        >
          <Icon name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isNew ? '種目を追加' : '種目を編集'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.preview}>
          <Thumbnail exercise={{ icon, photoUri, color }} size={128} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>種目名</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="例: ベンチプレス"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            maxLength={30}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>サムネイル</Text>
          <View style={styles.photoButtonRow}>
            <Pressable
              onPress={pickFromCamera}
              style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Icon name="camera" size={20} color={colors.text} />
              <Text style={styles.photoButtonLabel}>写真を撮る</Text>
            </Pressable>
            <Pressable
              onPress={pickFromLibrary}
              style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Icon name="image" size={20} color={colors.text} />
              <Text style={styles.photoButtonLabel}>写真を選ぶ</Text>
            </Pressable>
          </View>

          {photoUri ? (
            <Pressable
              onPress={() => setPhotoUri(undefined)}
              style={({ pressed }) => [styles.clearPhoto, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Icon name="trash" size={16} color={colors.danger} />
              <Text style={styles.clearPhotoLabel}>写真を外してアイコンに戻す</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            アイコン
            {photoUri ? <Text style={styles.fieldNote}>（写真を外すと表示されます）</Text> : null}
          </Text>
          <View style={styles.iconGrid}>
            {EXERCISE_ICONS.map((name) => {
              const selected = !photoUri && name === icon;
              return (
                <Pressable
                  key={name}
                  onPress={() => {
                    setIcon(name);
                    setPhotoUri(undefined);
                  }}
                  style={({ pressed }) => [
                    styles.iconCell,
                    { width: iconCellSize, height: iconCellSize },
                    selected && { borderColor: color, backgroundColor: `${color}22` },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Icon
                    name={name}
                    size={Math.round(iconCellSize * 0.44)}
                    color={selected ? color : colors.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>アイコンの色</Text>
          <View style={styles.colorRow}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={({ pressed }) => [
                  styles.colorDot,
                  { backgroundColor: c },
                  c === color && styles.colorDotSelected,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: c === color }}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.pressed]}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <>
              <Icon name="check" size={20} color={colors.bg} />
              <Text style={styles.saveLabel}>{isNew ? '追加する' : '保存する'}</Text>
            </>
          )}
        </Pressable>

        {onDelete ? (
          <Pressable
            onPress={() => void confirmDelete()}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Icon name="trash" size={18} color={colors.danger} />
            <Text style={styles.deleteLabel}>この種目を削除</Text>
          </Pressable>
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
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
  },
  // 負のマージンでアイコンの見た目を gutter に合わせる（当たり判定は 36px のまま）
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: layout.headerIconOffset,
  },
  // タイトルを中央に保つための、左ボタンと同じ幅の余白
  headerSpacer: { width: 36, marginRight: layout.headerIconOffset },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: layout.gutter,
    paddingBottom: 40,
    gap: 22,
  },

  preview: { alignItems: 'center', paddingVertical: 4 },

  field: { gap: 10 },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  fieldNote: { color: colors.textMuted, fontSize: 12, fontWeight: '400' },

  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  photoButtonRow: { flexDirection: 'row', gap: 10 },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  photoButtonLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  clearPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  clearPhotoLabel: { color: colors.danger, fontSize: 13, fontWeight: '600' },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ICON_GAP },
  iconCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: { borderColor: colors.text },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    minHeight: 54,
  },
  saveLabel: { color: colors.bg, fontSize: 16, fontWeight: '800' },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteLabel: { color: colors.danger, fontSize: 14, fontWeight: '600' },

  pressed: { opacity: 0.65 },
});
