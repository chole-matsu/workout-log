/**
 * サムネイルに使えるアイコン一覧。
 * すべて @expo/vector-icons の MaterialCommunityIcons に実在するグリフ名。
 */
export const EXERCISE_ICONS = [
  'dumbbell',
  'weight-lifter',
  'arm-flex',
  'kettlebell',
  'weight',
  'human-handsup',
  'gymnastics',
  'yoga',
  'run',
  'run-fast',
  'bike',
  'rowing',
  'swim',
  'jump-rope',
  'karate',
  'boxing-glove',
  'stairs',
  'shoe-sneaker',
  'heart-pulse',
  'human',
  'fire',
  'trophy',
] as const;

export type ExerciseIconName = (typeof EXERCISE_ICONS)[number];
