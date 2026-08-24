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
- **並び替え**：追加順 / 名前順 / 更新順の3基準。選択中のチップをもう一度押すと昇順⇄降順が入れ替わる
- 画面下部に広告枠（いまはプレースホルダー）

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
src/theme.ts                   配色・角丸・広告枠の高さ
src/icons.ts                   サムネイル用アイコン一覧
src/storage.ts                 AsyncStorage への保存・読み込み、写真の永続化
src/format.ts                  日付・セット表記の整形、最新記録の抽出、並び替え
src/components/Thumbnail.tsx   写真 or アイコンのサムネイル
src/components/AdBanner.tsx    画面下部の広告枠（AdMob 差し替え手順をコメントに記載）
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
- `sw.js` — Service Worker。26ファイルを事前キャッシュしてオフライン動作させる
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

## 広告（AdMob）を有効にする

Expo Go では AdMob のネイティブモジュールが動かないため、開発ビルドが必要です。

```bash
npx expo install react-native-google-mobile-ads expo-dev-client
eas build --platform ios --profile development
```

`app.json` の `plugins` に AdMob の設定を追加し、
`src/components/AdBanner.tsx` のコメントに従って `BannerAd` に差し替えてください。

**開発中は必ずテスト用の広告 ID (`TestIds.BANNER`) を使ってください。**
自分の本番広告を自分でタップすると、AdMob アカウントが停止されることがあります。

App Store で公開する場合は、これに加えて
App Tracking Transparency (ATT) の許可ダイアログと、プライバシーポリシーの掲載が必要です。
