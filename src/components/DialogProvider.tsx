import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';

/**
 * React Native の Alert.alert は react-native-web では何も起きない。
 * PWA でも同じ見た目・同じ挙動になるよう、自前のモーダルで置き換える。
 */

type ConfirmOptions = {
  title: string;
  message?: string;
  /** 実行ボタンの文言 */
  confirmLabel?: string;
  cancelLabel?: string;
  /** 削除など、取り返しのつかない操作は赤くする */
  destructive?: boolean;
};

type AlertOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
};

type DialogApi = {
  /** OK なら true、キャンセルなら false を返す */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** ボタン1つの通知。閉じたら解決する */
  alert: (options: AlertOptions) => Promise<void>;
};

type Request = ConfirmOptions & {
  /** キャンセルボタンを出すか（alert のときは出さない） */
  cancelable: boolean;
  resolve: (ok: boolean) => void;
};

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog は DialogProvider の中で呼んでください');
  return api;
}

export default function DialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  // 連打で前の Promise が宙に浮かないよう、閉じるときに必ず解決する
  const pending = useRef<((ok: boolean) => void) | null>(null);

  const close = useCallback((ok: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setRequest(null);
    resolve?.(ok);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          pending.current?.(false);
          pending.current = resolve;
          setRequest({ ...options, cancelable: true, resolve });
        }),
      alert: (options) =>
        new Promise<void>((resolve) => {
          pending.current?.(false);
          pending.current = () => resolve();
          setRequest({ ...options, cancelable: false, resolve: () => resolve() });
        }),
    }),
    []
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        visible={!!request}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <Pressable
          style={styles.backdrop}
          // 背景タップで閉じられるのは確認ダイアログのときだけ
          onPress={() => request?.cancelable && close(false)}
        >
          {/* カード自身のタップで閉じないよう、イベントをここで止める */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{request?.title}</Text>
            {request?.message ? <Text style={styles.message}>{request.message}</Text> : null}

            <View style={styles.buttonRow}>
              {request?.cancelable ? (
                <Pressable
                  onPress={() => close(false)}
                  style={({ pressed }) => [
                    styles.button,
                    styles.cancelButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelLabel}>{request.cancelLabel ?? 'キャンセル'}</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => close(true)}
                style={({ pressed }) => [
                  styles.button,
                  request?.destructive ? styles.destructiveButton : styles.confirmButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text
                  style={
                    request?.destructive ? styles.destructiveLabel : styles.confirmLabel
                  }
                >
                  {request?.confirmLabel ?? 'OK'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 8,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  message: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  confirmButton: { backgroundColor: colors.accent },
  confirmLabel: { color: colors.bg, fontSize: 14, fontWeight: '800' },
  destructiveButton: { backgroundColor: colors.danger },
  destructiveLabel: { color: colors.bg, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
