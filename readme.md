# budget_book

個人向けの収支記録・貸借管理システム。

Google Sheets と Google Apps Script (GAS) で作られています。

---

## 🔧 プロジェクト構成

- **収支記録（Entry）**
- **貸借管理（Debt）**
- **通知機能**
- **Web UI**

---

## 🚀 セットアップ方法

### 必要環境

- Node.js
- clasp（Google Apps Script CLI）

### インストール手順

```bash
git clone https://github.com/yousukeman3/budget_book.git
cd budget_book
npm install
```

### GASへのデプロイ手順

```bash
clasp login
npm run push
```

---

## 📖 ドキュメント一覧

詳しくは`docs`フォルダを参照してください。

- 設計思想
- 要件定義
- ユースケース一覧
- 命名ルール
- 命名済みリソース一覧
- ドメインルール一覧
- エラーハンドリング仕様書

---

## ⚙️ 開発コマンド

- ビルド・GASへのpush

```bash
npm run push
```

---

## 📌 備考・注意事項

- 個人利用を目的としているため、セキュリティ面の考慮は最低限にしています。
