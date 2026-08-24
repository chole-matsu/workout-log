import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { EXERCISE_ICONS } from '../icons';
import { persistPhoto } from '../storage';
import { colors, PALETTE, radius } from '../theme';
import type { Exercise } from '../types';

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
  const isNew = !exercise;

  const [name, setName] = useState(exercise?.name ?? '');
  const [icon, setIcon] = useState<string>(exercise?.icon ?? EXERCISE_ICONS[0]);
  const [photoUri, setPhotoUri] = useState<string | undefined>(exercise?.photoUri);
  const [color, setColor] = useState(exercise?.color ?? PALETTE[0]);
  const [saving, setSaving] = useState(false);

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'カメラを使えません',
        'iPhone の「設定」→ このアプリ → カメラ をオンにしてください。'
      );
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
      Alert.alert(
        '写真にアクセスできません',
        'iPhone の「設定」→ このアプリ → 写真 を許可してください。'
      );
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
      Alert.alert('種目名が空です', '種目の名前を入力してください。');
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

  const confirmDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      `「${exercise?.name}」を削除しますか？`,
      'この種目の記録もすべて削除されます。元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除する', style: 'destructive', onPress: onDelete },
      ]
    );
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
          <MaterialCommunityIcons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isNew ? '種目を追加' : '種目を編集'}</Text>
        <View style={styles.iconButton} />
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
              <MaterialCommunityIcons name="camera" size={20} color={colors.text} />
              <Text style={styles.photoButtonLabel}>写真を撮る</Text>
            </Pressable>
            <Pressable
              onPress={pickFromLibrary}
              style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="image-outline" size={20} color={colors.text} />
              <Text style={styles.photoButtonLabel}>写真を選ぶ</Text>
            </Pressable>
          </View>

          {photoUri ? (
            <Pressable
              onPress={() => setPhotoUri(undefined)}
              style={({ pressed }) => [styles.clearPhoto, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
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
                    selected && { borderColor: color, backgroundColor: `${color}22` },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <MaterialCommunityIcons
                    name={name as any}
                    size={24}
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
              <MaterialCommunityIcons name="check" size={20} color={colors.bg} />
              <Text style={styles.saveLabel}>{isNew ? '追加する' : '保存する'}</Text>
            </>
          )}
        </Pressable>

        {onDelete ? (
          <Pressable
            onPress={confirmDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
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
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
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

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconCell: {
    width: 52,
    height: 52,
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
