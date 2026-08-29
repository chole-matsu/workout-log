# 筋トレ記録 (workout-log)

iPhone 用の筋トレ記録アプリ。Expo (React Native) 製で、Windows から開発・ビルドできます。

**Expo SDK 54** を使用しています。これは App Store で配布されている Expo Go (v54) に
合わせたものです。SDK を上げると Expo Go が「Project is incompatible with this version of
Expo Go」と表示して起動しなくなるため、Expo Go で動かしている間は上げないでください。

## できること

- トップ画面にサムネイル＋種目名が3列で並ぶ
- サムネイルはアイコン22種から選ぶか、自分で撮影／選択した写真を設定できる
- サムネイルをタップすると **前回の重量と回数** が表示される
- そのまま今回のセット（重量 × 回数）を入力して記録できる
- **推移グラフ** — 最大重量 / 総挙上量を折れ線で表示（直近20件）
- **履歴一覧** — 過去の記録を新しい順に一覧表示
- **記録の編集・削除** — 履歴の行をタップすると、その日の記録を editable な入力欄に読み込む
- **並び替え**：追加順 / 名前順 / 更新順の3基準。選択中のチップをもう一度押すと昇順⇄降順が入れ替わる
- **テーマ切り替え**：黒地の「ナイト」と白地の「デイライト」。トップ画面右上のパレットから変更でき、選択は端末に保存される

### 並び替えの仕様

| 基準 | 昇順 | 降順 | 既定 |
|---|---|---|---|
| 追加順 | 古い→新しい | 新しい→古い | 昇順 |
| 名前順 | A→Z（あいうえお順） | Z→A | 昇順 |
| 更新順 | 古い→新しい | 新しい→古い | **降順** |

- 名前順は `localeCompare(name, 'ja')` を使うため、ひらがな・カタカナ・漢字・英字が自然な順に並びます
- 更新順では、まだ記録がない種目は**向きに関わらず常に末尾**に置かれます
- 選んだ並び順は端末に保存され、アプリを再起動しても維持されます

データは端末内の AsyncStorage に保存されます。サーバーもアカウントも不要です。
写真はキャッシュではなくドキュメント領域へコピーされるので、OS に消されません。

## 実装上の注意（触るときに引っかかりやすい点）

このアプリは iOS（Expo Go）と Web（PWA）の両方で動かすため、
片方でしか動かない API を避けています。以下は実際に踏んだ問題です。

- **`Alert.alert` は使わないこと。** react-native-web では何も起きず、削除の確認ダイアログが
  出ないまま削除も実行されません。`src/components/DialogProvider.tsx` の `useDialog()` を使ってください
- **`onLayout` に依存しないこと。** react-native-web で発火しないことがあり、幅が 0 のまま
  グラフが描画されませんでした。`useWindowDimensions()` から幅を計算して渡しています
- **アイコンフォントは使わないこと。** 以前は `@expo/vector-icons` を使っていましたが、
  `expo-font` のバージョンが噛み合わずアイコンが一切表示されない問題が起きました。
  いまは `src/components/Icon.tsx` ですべて SVG で描いています。
  追加のフォント読み込みが無いので、iOS でも Web でも必ず表示されます。
  アイコンを増やすときは `GLYPHS` に 24×24 の座標系でパスを足してください
- **Web の写真は data URL に変換していること。** `expo-image-picker` は Web では `blob:` URL を
  返しますが、これはページを閉じると無効になります。`persistPhoto()` が 256×256 に縮小して
  data URL 化しています
- **flex の中の `TextInput` には `minWidth: 0` を付けること。** これが無いと `<input>` の
  既定の固有幅（約217px）が縮まず、入力欄が画面からはみ出します（`colInput` を参照）
- **画面幅から寸法を計算するときは下限を設けること。** `useWindowDimensions()` は初回
  レイアウトで 0 を返すことがあり、そのまま余白を引くと負の値になって SVG の描画が
  失敗します（`Math.max(..., n)` で囲む）

## テーマの決まりごと

- **色を直接書かないこと。** 画面のスタイルは `const makeStyles = (c: Palette) => StyleSheet.create({...})`
  の形でモジュールのトップレベルに置き、コンポーネント内で `useThemedStyles(makeStyles)` を呼びます。
  `StyleSheet.create` を即時実行すると、その時点の色で固まって切り替わりません
- **`makeStyles` は必ずトップレベルに置くこと。** コンポーネントの中で定義すると毎回別の関数になり、
  レンダーのたびにスタイルを作り直すことになります
- **アクセント色の上に乗せる文字は `c.onAccent` を使うこと。** 黒地では暗い色、白地では白になります。
  `c.bg` を使うと白テーマで白地に白文字になって読めません
- **`c` という名前を他で使わないこと。** `array.map((c) => ...)` のような書き方をすると
  テーマの `c` を隠してしまいます（実際に踏みました）
- **種目ごとの色は保存済みデータに入っています。** 暗い背景向けに選ばれた明るい色は白地だと
  薄すぎるので、`Thumbnail` が `iconColor()` を通して濃さを自動調整します

## レイアウトの決まりごと

画面をまたいで見た目を揃えるため、以下を守っています。

- 左右の余白は `theme.ts` の `layout.gutter`（16px）に統一。見出し・カード・ボタンの
  左端がすべてこの位置に揃います
- ヘッダーのアイコンボタンは 36px の当たり判定を保ったまま、`layout.headerIconOffset`（-8px）で
  アイコンの見た目だけを gutter に寄せています
- トップ画面のカードは、種目名の表示領域を2行分で固定（`NAME_LINE_HEIGHT × NAME_LINES`）。
  名前が1行でも2行でも、同じ行のカードの高さと文字の位置が揃います
- 3列に収めるため、カードの要約は `formatTopSet()`（一番重いセットのみ）を使います。
  `formatSets()` の全文は幅が足りず途中で切れます
- グラフは左端に 46px の目盛り用の余白を確保し、数値ラベルが点や日付とぶつからないように
  しています

## 開発の始め方

```bash
npm install
npx expo start
```

ターミナルに QR コードが出ます。iPhone に **Expo Go**（App Store で無料）を入れて、
標準のカメラアプリで QR を読むとアプリが起動します。
PC と iPhone を **同じ Wi-Fi** につないでください。

うまく繋がらない場合はトンネル経由で：

```bash
npx expo start --tunnel
```

## ディレクトリ構成

```
App.tsx                        画面遷移と、種目／記録データの管理
src/types.ts                   データ型と並び替えの定義（SORT_OPTIONS）
src/theme.ts                   テーマ定義（配色2種）・角丸・余白の基準
src/components/Icon.tsx        全アイコンの SVG 定義（フォント不使用）
src/icons.ts                   サムネイル用アイコン一覧（Icon.tsx の再エクスポート）
src/storage.ts                 AsyncStorage への保存・読み込み、写真の永続化
src/format.ts                  日付・セット表記の整形、最新記録の抽出、並び替え
src/components/Thumbnail.tsx   写真 or アイコンのサムネイル
src/components/ProgressChart.tsx  記録の推移を描く折れ線グラフ
src/components/DialogProvider.tsx 確認・通知ダイアログ（Alert.alert の代替）
src/components/ThemeProvider.tsx  テーマの配布と useThemedStyles
src/components/ThemePicker.tsx    テーマ選択モーダル（見本つき）
src/screens/HomeScreen.tsx     トップ画面（3列グリッド＋並び替え）
src/screens/DetailScreen.tsx   前回の記録の表示 ＋ 今回の記録の入力
src/screens/EditExerciseScreen.tsx  種目の追加・編集・削除
```

## 家の外で使う：PWA として GitHub Pages に公開する

Expo Go は PC の開発サーバーに繋がっている必要があるため、ジムでは使えません。
Web 版を公開してホーム画面に追加すれば、**無料・PC不要・オフライン**で使えます。

### 1. ビルド

```bash
npm run build:web
```

`dist/` に以下が生成されます。

- Expo の Web ビルド一式（すべて `/workout-log/` 始まりのパス）
- `manifest.webmanifest` — ホーム画面用の名前・アイコン・`display: standalone`
- `sw.js` — Service Worker。オフラインで動くようファイルをキャッシュする
- `.nojekyll` — **必須**。これが無いと GitHub Pages が `_expo/` を無視してJSが404になる
- `404.html` — どのパスで再読み込みされてもトップを返す

### 2. GitHub に上げる

リポジトリ名は **`workout-log`** にしてください。
別の名前にする場合は `app.json` の `experiments.baseUrl` も同じ名前に変更が必要です
（ここがずれると真っ白な画面になります）。

Windows PowerShell 5.1 は `&&` を使えないため、1行ずつ実行してください。
また、**必ずプロジェクトのフォルダに移動してから**実行してください。

```bash
cd D:\github\workout-log
```

```bash
git add -A
```

```bash
git commit -m "筋トレ記録アプリ"
```

`create-expo-app` が作る初期ブランチは `master` です。GitHub の既定は `main` なので合わせます。

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/<ユーザー名>/workout-log.git
```

```bash
git push -u origin main
```

### 3. 公開

```bash
npm run deploy
```

ビルドして `gh-pages` ブランチに push します。
その後 GitHub の **Settings → Pages** で Source を「Deploy from a branch」、
ブランチを **`gh-pages` / (root)** に設定してください。

数分で `https://<ユーザー名>.github.io/workout-log/` が公開されます。

### 4. iPhone のホーム画面に追加

1. **Safari** で上記URLを開く（Chrome ではなく Safari。iOS では Safari が確実です）
2. 下部の共有ボタン（□に↑）をタップ
3. 「ホーム画面に追加」

アイコンから起動すると、Safari のアドレスバーが出ない全画面表示になります。
一度開けばオフラインでも起動します。

### PWA の制約

- **データは Safari のストレージに保存されます。** Safari の履歴・データを消すと記録も消えます。バックアップ機能はありません
- 写真は 256×256 に縮小して保存されます（元のまま保存すると容量をすぐ使い切るため）
- **AdMob は使えません**（Google の規約でWebページへのAdMob掲載は禁止）。広告を出すなら下記の EAS Build ルートが必要です
- コードを更新したら `npm run deploy` を再実行してください。次回起動時に自動で更新されます

### Service Worker のキャッシュ方針

過去に「公開し直したのに古い画面が出続ける」問題を起こしたので、以下のように分けています。

- **ページ本体（navigate）はネットワーク優先。** 読めたら控えを更新し、電波が無いときだけ
  キャッシュを返します。全部をキャッシュ優先にすると、更新が永久に反映されません
- **JS や画像はキャッシュ優先。** ファイル名にビルドのハッシュが入っており、中身が変われば
  名前も変わるので、古いものを返す心配がありません
- **キャッシュ名は「ファイル一覧」と「SW の処理内容」の両方から作ります。** ファイル一覧だけだと
  SW のロジックを直しても名前が変わらず、古いキャッシュが残り続けます

## iPhone 実機へのビルド（EAS Build）

Mac は不要です。ビルドは Expo のクラウド上の macOS で行われます。
ただし **実機インストールには Apple Developer Program（年間 $99）が必要** です。

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
```

途中で Apple ID を聞かれ、証明書とプロビジョニングプロファイルは EAS が自動生成します。
完成した `.ipa` は TestFlight 経由で iPhone にインストールできます。

```bash
eas submit --platform ios --latest
```

### 注意

- `app.json` の `ios.bundleIdentifier` は `com.example.workoutlog` のままです。
  ビルド前に自分のドメインを逆にしたユニークな ID に変更してください。
- SDK 54 は Node v20.17.0 で問題なく動きます。ただし EAS Build で失敗する場合は
  Node を 20.19.4 以上に更新してください（`winget upgrade --id OpenJS.NodeJS.20`）。

## 広告（AdMob）を後から入れたくなったら

画面下部にあった広告枠は削除済みです。入れ直す手順を残しておきます。
Expo Go では AdMob のネイティブモジュールが動かないため、開発ビルドが必要です。

**1. AdMob でアプリを登録**し、アプリ ID とバナー広告ユニット ID を取得します。

**2. パッケージを入れる**

```bash
npx expo install react-native-google-mobile-ads expo-dev-client
```

**3. `app.json` の `plugins` に追加**（ID は自分のものに置き換える）

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-XXXXXXXX~XXXXXXXX",
    "iosAppId": "ca-app-pub-XXXXXXXX~XXXXXXXX"
  }
]
```

**4. 開発ビルドを作る**（Expo Go ではなくこのビルドで動かす）

```bash
eas build --platform ios --profile development
```

**5. バナーを置く。** アプリ起動時に一度だけ `mobileAds().initialize()` を呼び、
`App.tsx` の `<View style={{ height: insets.bottom }} />` の直前に差し込みます。

```tsx
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-XXXXXXXX/XXXXXXXX';

<BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
```

**開発中は必ずテスト用の広告 ID (`TestIds.BANNER`) を使ってください。**
自分の本番広告を自分でタップすると、無効なトラフィックとみなされ
AdMob アカウントが停止されることがあります。

なお **PWA（GitHub Pages 版）では AdMob は使えません**。Google の規約で
Web ページへの AdMob 掲載は禁止されています。

App Store で公開する場合は、これに加えて
App Tracking Transparency (ATT) の許可ダイアログと、プライバシーポリシーの掲載が必要です。
