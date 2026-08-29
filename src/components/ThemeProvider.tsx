import { createContext, useContext, useMemo } from 'react';

import { readableOn, THEMES, type Palette, type ThemeName } from '../theme';

type ThemeValue = {
  name: ThemeName;
  /** 画面で使う色一式 */
  c: Palette;
  /** 新しい種目に割り当てる色の候補 */
  exerciseColors: string[];
  /** 保存済みの種目の色を、いまのテーマで読める濃さに直す */
  iconColor: (hex: string) => string;
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme は ThemeProvider の中で呼んでください');
  return value;
}

/**
 * StyleSheet はテーマごとに作り直す必要がある。
 * 各画面は makeStyles を モジュールの外側（トップレベル）に置いて、
 * この関数に渡すこと。関数の同一性が保たれるので作り直しは最小で済む。
 */
export function useThemedStyles<T>(makeStyles: (c: Palette) => T): T {
  const { c } = useTheme();
  return useMemo(() => makeStyles(c), [makeStyles, c]);
}

type Props = {
  name: ThemeName;
  onChange: (name: ThemeName) => void;
  children: React.ReactNode;
};

export default function ThemeProvider({ name, onChange, children }: Props) {
  const value = useMemo<ThemeValue>(() => {
    const theme = THEMES[name] ?? THEMES.dark;
    return {
      name,
      c: theme.palette,
      exerciseColors: theme.exerciseColors,
      iconColor: (hex: string) => readableOn(hex, name),
      setTheme: onChange,
    };
  }, [name, onChange]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
