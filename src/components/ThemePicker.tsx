import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { useTheme, useThemedStyles } from './ThemeProvider';
import { radius, THEME_NAMES, THEMES, type Palette, type ThemeName } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** 見本として、そのテーマの実際の色でミニ画面を描く */
function Preview({ name }: { name: ThemeName }) {
  const t = THEMES[name];
  const p = t.palette;
  return (
    <View style={[previewStyles.frame, { backgroundColor: p.bg, borderColor: p.border }]}>
      <View style={previewStyles.row}>
        {t.exerciseColors.slice(0, 3).map((color) => (
          <View
            key={color}
            style={[
              previewStyles.tile,
              { backgroundColor: `${color}22`, borderColor: `${color}66` },
            ]}
          >
            <View style={[previewStyles.dot, { backgroundColor: color }]} />
          </View>
        ))}
      </View>
      <View style={[previewStyles.bar, { backgroundColor: p.surfaceAlt }]} />
      <View style={[previewStyles.bar, previewStyles.barShort, { backgroundColor: p.surfaceAlt }]} />
      <View style={[previewStyles.button, { backgroundColor: p.accent }]} />
    </View>
  );
}

export default function ThemePicker({ visible, onClose }: Props) {
  const { name: current, c, setTheme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* カード自身のタップで閉じないよう、ここでイベントを止める */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>テーマ</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Icon name="close" size={20} color={c.textMuted} />
            </Pressable>
          </View>

          <View style={styles.options}>
            {THEME_NAMES.map((themeName) => {
              const theme = THEMES[themeName];
              const selected = themeName === current;
              return (
                <Pressable
                  key={themeName}
                  onPress={() => {
                    setTheme(themeName);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`テーマを ${theme.label} にする`}
                >
                  <Preview name={themeName} />
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {theme.label}
                    </Text>
                    <Text style={styles.optionDescription}>{theme.description}</Text>
                  </View>
                  {selected ? <Icon name="check" size={18} color={c.accent} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.note}>
            すでに登録した種目の色はそのまま残ります。白いテーマでは読みやすい濃さに自動で調整されます。
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const previewStyles = StyleSheet.create({
  frame: {
    width: 62,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: 6,
    gap: 4,
  },
  row: { flexDirection: 'row', gap: 3 },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  bar: { height: 4, borderRadius: 2 },
  barShort: { width: '60%' },
  button: { height: 8, borderRadius: 3, marginTop: 1 },
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      gap: 16,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: c.text, fontSize: 17, fontWeight: '800' },
    closeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

    options: { gap: 10 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 12,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    optionSelected: { borderColor: c.accent, backgroundColor: c.accentSoft },
    optionText: { flex: 1, minWidth: 0, gap: 2 },
    optionLabel: { color: c.text, fontSize: 15, fontWeight: '700' },
    optionLabelSelected: { color: c.accent },
    optionDescription: { color: c.textMuted, fontSize: 12 },

    note: { color: c.textMuted, fontSize: 11, lineHeight: 16 },
    pressed: { opacity: 0.7 },
  });
