# 食事記録アプリ

増量期メニュー（〜12月）用の食事記録 PWA。プリセットをタップするとカロリーとタンパク質が自動で入り、写真・体重・体脂肪率も日付ごとに記録できる。Firebase で端末間同期。

- 区分：朝食／昼食／間食／夕食／寝る前
- 昼食は写真とメモ（食べたもの）を残せる
- その他（外食など）は自由入力、「よく食べるものに登録」で再利用できる
- 日・週（月〜日）・月の合計と1日平均、体重グラフ、直近21日の一覧

---

## 1. GitHub に置く

```bash
git init
git add .
git commit -m "食事記録アプリ"
git branch -M main
git remote add origin https://github.com/AU-0716/meal-log.git
git push -u origin main
```

GitHub の **Settings → Pages** で Source を `Deploy from a branch`、Branch を `main / (root)` にすると
`https://au-0716.github.io/meal-log/meallog.html` で開ける。スマホのブラウザで開き「ホーム画面に追加」するとアプリのように使える。

> ES モジュールを使っているので、`meallog.html` をファイルとして直接開くと動かない。GitHub Pages か `python3 -m http.server` などで開くこと。

---

## 2. Firebase の設定（同期と写真の保存）

設定しなくても動くが、その場合は開いた端末のみに保存される（写真も端末内のみ）。

### 2-1. プロジェクトを作る
1. https://console.firebase.google.com/ で新規プロジェクトを作成
2. 左メニューから **Firestore Database** を作成（本番モードでよい）
3. **Storage** を作成
4. **Authentication → Sign-in method** で「メール/パスワード」を有効化
5. **Authentication → Users → ユーザーを追加** で自分用のアカウントを1つ作る
6. **Authentication → Settings → 承認済みドメイン** に `au-0716.github.io` を追加

### 2-2. 設定値を貼る
**プロジェクトの設定 → マイアプリ → ウェブアプリを追加** で出てくる `firebaseConfig` を
`js/firebase-config.js` に貼り付ける。

### 2-3. セキュリティルール

Firestore（**Firestore Database → ルール**）:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Storage（**Storage → ルール**）:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

これで自分のアカウント以外はデータも写真も読めない。

---

## 3. ファイル構成

```
meallog.html              アプリ画面
css/style.css             見た目
js/presets.js             食品・セット・夕食メニューの定義（数値の変更はここ）
js/firebase-config.js     Firebase の設定（要編集）
js/app.js                 本体
manifest.webmanifest      ホーム画面追加用
sw.js                     オフライン表示用 Service Worker
icons/                    アイコン
```

## 4. メニューを変えたいとき

`js/presets.js` を編集する。

- 食品の追加：`FOODS` に `キー: { n: '名前', k: kcal, p: タンパク質g }` を足し、`FOOD_ORDER` にキーを足す
- 夕食メニューの変更：`DINNERS` の `items` に食品のキーを並べる
- 目標値の変更：`GOAL` の `kcal` と `protein`

## 5. データの持ち方

Firestore

```
users/{uid}/days/2026-09-18
  { date, items[{id,slot,n,k,p}], photos[{id,slot,path,url}], lunchNote, weight, fat, updatedAt }
users/{uid}/config/custom
  { list[{n,k,p}] }
```

写真は Storage の `users/{uid}/photos/{日付}/{id}.jpg`。アップロード前に長辺1280pxのJPEGへ圧縮している。
