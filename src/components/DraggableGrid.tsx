import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

/**
 * 長押ししてからドラッグでタイルを並べ替えられるグリッド。
 *
 * 追加のライブラリは使わず、React Native 標準の PanResponder と Animated だけで作る。
 * （react-native-gesture-handler を入れると Expo Go / Web の両対応が面倒になるため）
 *
 * タップ・長押し・ドラッグを「タイル1枚につき PanResponder 1つ」でまとめて扱う。
 * Pressable と PanResponder を併用すると、指を置いた時点で Pressable が
 * レスポンダを取ってしまい、親のドラッグ処理に指の動きが届かない。
 *
 * タイルは絶対配置。位置は「並びの中の何番目か」から計算するので、
 * 並びを入れ替えるだけで見た目も入れ替わる。
 */

/** これ以上動いたら「タップではない」と判断する距離 */
const TAP_SLOP = 8;
/** 長押しと判定するまでの時間 */
const LONG_PRESS_MS = 250;

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, dragging: boolean) => React.ReactNode;
  onPressItem: (item: T) => void;
  /** 並べ替えが確定したときに、新しい id の並びを返す */
  onReorder: (ids: string[]) => void;
  /** ドラッグが始まったとき（画面のスクロールを止めるのに使う） */
  onDragStart: () => void;
  /** false のときはドラッグせず、ただのグリッドとして振る舞う */
  draggable: boolean;
  columns: number;
  gap: number;
  cardWidth: number;
  cardHeight: number;
};

export default function DraggableGrid<T>({
  items,
  keyOf,
  renderItem,
  onPressItem,
  onReorder,
  onDragStart,
  draggable,
  columns,
  gap,
  cardWidth,
  cardHeight,
}: Props<T>) {
  /** ドラッグ中だけ使う「見た目の並び」。確定したら親に返す */
  const [preview, setPreview] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // PanResponder は作り直されないので、最新の値は ref 経由で読む
  const draggingRef = useRef<string | null>(null);
  const previewRef = useRef<string[]>([]);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  /** ドラッグを始めたときのマスの位置。ドラッグ中は動かさない */
  const startSlotRef = useRef({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  const baseIds = useMemo(() => items.map(keyOf), [items, keyOf]);
  const ids = preview ?? baseIds;
  previewRef.current = ids;

  // 依存配列に入れずに最新の関数を呼べるようにしておく
  const cb = useRef({ onPressItem, onReorder, onDragStart, draggable, items, keyOf });
  cb.current = { onPressItem, onReorder, onDragStart, draggable, items, keyOf };

  useEffect(() => {
    if (!draggable) {
      setPreview(null);
      setDraggingId(null);
      draggingRef.current = null;
    }
  }, [draggable]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const slot = (index: number) => ({
    left: (index % columns) * (cardWidth + gap),
    top: Math.floor(index / columns) * (cardHeight + gap),
  });

  /** 指の位置から、いま何番目のマスにいるかを求める */
  const slotAt = (x: number, y: number) => {
    const col = Math.min(Math.max(Math.round(x / (cardWidth + gap)), 0), columns - 1);
    const row = Math.max(Math.round(y / (cardHeight + gap)), 0);
    return Math.min(row * columns + col, previewRef.current.length - 1);
  };

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const responders = useMemo(() => {
    const map = new Map<string, ReturnType<typeof PanResponder.create>>();

    for (const id of baseIds) {
      map.set(
        id,
        PanResponder.create({
          // 指を置いた時点で受け取る。スクロールしたいときは下の
          // onPanResponderTerminationRequest で ScrollView に譲る。
          onStartShouldSetPanResponder: () => true,

          onPanResponderGrant: () => {
            movedRef.current = false;
            clearTimer();
            if (!cb.current.draggable) return;
            timerRef.current = setTimeout(() => {
              if (movedRef.current) return;
              const at = slot(previewRef.current.indexOf(id));
              startSlotRef.current = { x: at.left, y: at.top };
              pan.setValue({ x: 0, y: 0 });
              draggingRef.current = id;
              setDraggingId(id);
              cb.current.onDragStart();
            }, LONG_PRESS_MS);
          },

          // ドラッグしていないあいだは、スクロールしたい ScrollView に譲る
          onPanResponderTerminationRequest: () => draggingRef.current === null,

          onPanResponderMove: (_e, g) => {
            if (Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP) {
              movedRef.current = true;
              if (!draggingRef.current) clearTimer();
            }
            if (draggingRef.current !== id) return;

            // 判定の基準はドラッグを始めたときのマスに固定する。
            // ここを動かすと補正が二重に効いて、前方向へ飛びすぎる。
            const start = startSlotRef.current;
            const from = previewRef.current.indexOf(id);
            if (from < 0) return;

            let order = previewRef.current;
            const to = slotAt(start.x + g.dx, start.y + g.dy);
            if (to !== from) {
              order = [...order];
              order.splice(to, 0, order.splice(from, 1)[0]);
              previewRef.current = order;
              setPreview(order);
            }

            // 並びが変わるとタイルの定位置も変わる。指の下から離れないよう、
            // 「開始マス＋移動量」と「いまの定位置」の差を平行移動にする。
            const cur = slot(order.indexOf(id));
            pan.setValue({ x: start.x + g.dx - cur.left, y: start.y + g.dy - cur.top });
          },

          onPanResponderRelease: () => {
            clearTimer();
            if (draggingRef.current === id) {
              const finished = previewRef.current;
              draggingRef.current = null;
              setDraggingId(null);
              pan.setValue({ x: 0, y: 0 });
              setPreview(null);
              cb.current.onReorder(finished);
              return;
            }
            // 動かしていなければ、ただのタップとして扱う
            if (!movedRef.current) {
              const item = cb.current.items.find((it) => cb.current.keyOf(it) === id);
              if (item) cb.current.onPressItem(item);
            }
          },

          onPanResponderTerminate: () => {
            clearTimer();
            if (draggingRef.current === id) {
              draggingRef.current = null;
              setDraggingId(null);
              pan.setValue({ x: 0, y: 0 });
              setPreview(null);
            }
          },
        })
      );
    }
    return map;
  }, [baseIds, columns, gap, cardWidth, cardHeight]);

  const rows = Math.ceil(ids.length / columns);
  const height = rows > 0 ? rows * (cardHeight + gap) - gap : 0;
  const byId = new Map(items.map((item) => [keyOf(item), item]));

  return (
    <View style={[styles.container, { height }]}>
      {ids.map((id, index) => {
        const item = byId.get(id);
        const responder = responders.get(id);
        if (!item || !responder) return null;
        const isDragging = id === draggingId;
        const { left, top } = slot(index);

        return (
          <Animated.View
            key={id}
            {...responder.panHandlers}
            style={[
              styles.tile,
              { left, top, width: cardWidth, height: cardHeight },
              isDragging && {
                transform: [...pan.getTranslateTransform(), { scale: 1.06 }],
                zIndex: 10,
                elevation: 8,
              },
            ]}
          >
            {renderItem(item, isDragging)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', width: '100%' },
  tile: { position: 'absolute' },
});
