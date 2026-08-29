import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import Icon from './Icon';
import { useTheme } from './ThemeProvider';
import { radius } from '../theme';
import type { Exercise } from '../types';

type Props = {
  exercise: Pick<Exercise, 'icon' | 'photoUri' | 'color'>;
  size: number;
  /** 角丸。省略時はサイズに応じて自動 */
  borderRadius?: number;
};

/** 写真があれば写真を、無ければ色付きアイコンを表示する */
export default function Thumbnail({ exercise, size, borderRadius }: Props) {
  const { c, iconColor } = useTheme();
  const br = borderRadius ?? (size >= 96 ? radius.lg : radius.md);

  if (exercise.photoUri) {
    return (
      <Image
        source={{ uri: exercise.photoUri }}
        style={{ width: size, height: size, borderRadius: br, backgroundColor: c.surfaceAlt }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  // 保存済みの色は暗い背景向けに選ばれていることがあるので、テーマに合わせて濃さを直す
  const tint = iconColor(exercise.color);

  return (
    <View
      style={[
        styles.iconBox,
        {
          width: size,
          height: size,
          borderRadius: br,
          backgroundColor: `${tint}22`,
          borderColor: `${tint}55`,
        },
      ]}
    >
      <Icon name={exercise.icon} size={Math.round(size * 0.46)} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
