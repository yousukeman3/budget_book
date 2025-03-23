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

- [設計思想](docs/設計思想.md)
- [要件定義](docs/要件定義.md)
- [ユースケース一覧](docs/ユースケース一覧.md)
- [命名ルール](docs/命名ルール.md)
- [命名済みリソース一覧](docs/命名済みリソース一覧.md)
- [ドメインルール一覧](docs/ドメインルール一覧.md)
- [エラーハンドリング仕様書](docs/エラーハンドリング仕様書.md)

---

## ⚙️ 開発コマンド

- ビルド・GASへのpush

```bash
npm run push
```

---

## 📌 備考・注意事項

- 個人利用を目的としているため、セキュリティ面の考慮は最低限にしています。
