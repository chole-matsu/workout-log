import { StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { AD_BANNER_HEIGHT, colors } from '../theme';

/**
 * 画面下部の広告枠。
 *
 * いまはプレースホルダー（枠だけ）です。Expo Go では AdMob のネイティブ
 * モジュールが動かないため、実機での動作確認を優先してこの形にしています。
 *
 * ── 本物の AdMob に差し替える手順 ────────────────────────────
 * 1. AdMob でアプリを登録し、アプリ ID とバナー広告ユニット ID を取得
 * 2. npx expo install react-native-google-mobile-ads
 * 3. app.json の plugins に以下を追加（ID は自分のものに置き換える）
 *
 *      [
 *        "react-native-google-mobile-ads",
 *        {
 *          "androidAppId": "ca-app-pub-XXXXXXXX~XXXXXXXX",
 *          "iosAppId": "ca-app-pub-XXXXXXXX~XXXXXXXX"
 *        }
 *      ]
 *
 * 4. eas build --profile development --platform ios で開発ビルドを作る
 *    （Expo Go ではなく、このビルドで動かす）
 * 5. 下のコメントを外して、上の return を置き換える
 *
 *    import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
 *
 *    // アプリ起動時に一度だけ mobileAds().initialize() を呼ぶこと（App.tsx など）
 *
 *    const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-XXXXXXXX/XXXXXXXX';
 *
 *    return (
 *      <View style={styles.wrap}>
 *        <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
 *      </View>
 *    );
 *
 * 開発中は必ず TestIds を使ってください。自分の本番広告を自分でタップすると
 * 無効なトラフィックとみなされ、AdMob アカウントが停止されることがあります。
 * ────────────────────────────────────────────────────
 */
export default function AdBanner() {
  return (
    <View style={styles.wrap}>
      <Icon name="tag" size={14} color={colors.textMuted} />
      <Text style={styles.label}>広告スペース</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: AD_BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
