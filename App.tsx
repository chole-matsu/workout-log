import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import AdBanner from './src/components/AdBanner';
import DialogProvider from './src/components/DialogProvider';
import DetailScreen from './src/screens/DetailScreen';
import EditExerciseScreen, { type ExerciseDraft } from './src/screens/EditExerciseScreen';
import HomeScreen from './src/screens/HomeScreen';
import {
  deletePhoto,
  loadExercises,
  loadRecords,
  loadSort,
  newId,
  saveExercises,
  saveRecords,
  saveSort,
  today,
} from './src/storage';
import { colors } from './src/theme';
import { DEFAULT_SORT, type Exercise, type SortState, type WorkoutRecord, type WorkoutSet } from './src/types';

type Route =
  | { name: 'home' }
  | { name: 'detail'; exerciseId: string }
  | { name: 'edit'; exerciseId?: string };

function Root() {
  const insets = useSafeAreaInsets();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>({ name: 'home' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ex, rec, storedSort] = await Promise.all([
        loadExercises(),
        loadRecords(),
        loadSort(),
      ]);
      if (cancelled) return;
      setExercises(ex);
      setRecords(rec);
      setSort(storedSort);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeSort = useCallback((next: SortState) => {
    setSort(next);
    void saveSort(next);
  }, []);

  // 画面を待たせないよう、state を更新してから裏で永続化する
  const commitExercises = useCallback((next: Exercise[]) => {
    setExercises(next);
    void saveExercises(next);
  }, []);

  const commitRecords = useCallback((next: WorkoutRecord[]) => {
    setRecords(next);
    void saveRecords(next);
  }, []);

  const handleAddExercise = useCallback(
    (draft: ExerciseDraft) => {
      const exercise: Exercise = { id: newId(), createdAt: Date.now(), ...draft };
      commitExercises([...exercises, exercise]);
      setRoute({ name: 'home' });
    },
    [exercises, commitExercises]
  );

  const handleUpdateExercise = useCallback(
    (id: string, draft: ExerciseDraft) => {
      const prev = exercises.find((e) => e.id === id);
      // 写真を差し替えた／外したら、古いファイルは残さない
      if (prev?.photoUri && prev.photoUri !== draft.photoUri) {
        void deletePhoto(prev.photoUri);
      }
      commitExercises(exercises.map((e) => (e.id === id ? { ...e, ...draft } : e)));
      setRoute({ name: 'detail', exerciseId: id });
    },
    [exercises, commitExercises]
  );

  const handleDeleteExercise = useCallback(
    (id: string) => {
      const target = exercises.find((e) => e.id === id);
      void deletePhoto(target?.photoUri);
      commitExercises(exercises.filter((e) => e.id !== id));
      commitRecords(records.filter((r) => r.exerciseId !== id));
      setRoute({ name: 'home' });
    },
    [exercises, records, commitExercises, commitRecords]
  );

  const handleSaveRecord = useCallback(
    (exerciseId: string, sets: WorkoutSet[], memo: string) => {
      const date = today();
      const existing = records.find((r) => r.exerciseId === exerciseId && r.date === date);

      // 同じ日に2回保存したときは上書きする（記録が二重に増えないように）
      const next = existing
        ? records.map((r) => (r.id === existing.id ? { ...r, sets, memo } : r))
        : [...records, { id: newId(), exerciseId, date, sets, memo, createdAt: Date.now() }];

      commitRecords(next);
    },
    [records, commitRecords]
  );

  const handleUpdateRecord = useCallback(
    (recordId: string, sets: WorkoutSet[], memo: string) => {
      commitRecords(records.map((r) => (r.id === recordId ? { ...r, sets, memo } : r)));
    },
    [records, commitRecords]
  );

  const handleDeleteRecord = useCallback(
    (recordId: string) => {
      commitRecords(records.filter((r) => r.id !== recordId));
    },
    [records, commitRecords]
  );

  const activeExercise = useMemo(() => {
    const id = route.name === 'home' ? undefined : route.exerciseId;
    return id ? exercises.find((e) => e.id === id) : undefined;
  }, [route, exercises]);

  let screen: React.ReactNode;

  if (loading) {
    screen = (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  } else if (route.name === 'edit') {
    screen = (
      <EditExerciseScreen
        // 編集対象が変わったら入力状態を作り直す
        key={activeExercise?.id ?? 'new'}
        exercise={activeExercise}
        onCancel={() =>
          setRoute(
            activeExercise ? { name: 'detail', exerciseId: activeExercise.id } : { name: 'home' }
          )
        }
        onSubmit={(draft) =>
          activeExercise ? handleUpdateExercise(activeExercise.id, draft) : handleAddExercise(draft)
        }
        onDelete={activeExercise ? () => handleDeleteExercise(activeExercise.id) : undefined}
      />
    );
  } else if (route.name === 'detail' && activeExercise) {
    screen = (
      <DetailScreen
        key={activeExercise.id}
        exercise={activeExercise}
        records={records}
        onBack={() => setRoute({ name: 'home' })}
        onEdit={() => setRoute({ name: 'edit', exerciseId: activeExercise.id })}
        onSaveToday={(sets, memo) => handleSaveRecord(activeExercise.id, sets, memo)}
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
      />
    );
  } else {
    screen = (
      <HomeScreen
        exercises={exercises}
        records={records}
        sort={sort}
        onChangeSort={handleChangeSort}
        onOpen={(exerciseId) => setRoute({ name: 'detail', exerciseId })}
        onAdd={() => setRoute({ name: 'edit' })}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.screen}>{screen}</View>

      {/* 画面下部の広告枠。ホームインジケータに重ならないよう下に余白を足す */}
      <AdBanner />
      <View style={{ height: insets.bottom, backgroundColor: colors.surface }} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DialogProvider>
        <Root />
      </DialogProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
