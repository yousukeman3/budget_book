# 💸 budget_book

個人向けの収支記録・貸借管理システム  
**Next.js + Prisma + PostgreSQL + Docker** によるフルスタック構成。

> Google Apps Script 版から構成を一新し、型安全性・拡張性を強化しました。

---

## 📦 機能一覧

- 収支の記録（Entry）
- 貸借管理（Debt）と返済進捗の追跡
- 支払い手段（Method）やカテゴリ（Category）の自由な定義
- 月次レポート／資産推移の可視化（予定）
- 通知・コンシェルジュ連携（構想中）

---

## 🚀 セットアップ方法

### 必要環境

- Node.js（18以上推奨）
- Docker + Docker Compose
- VSCode + Dev Container 推奨

### 初期化手順

```bash
git clone https://github.com/yousukeman3/budget_book.git
cd budget_book
pnpm install
pnpm docker:init  # docker-compose up などにラップ
```

### Prismaマイグレーション・Studio起動

```bash
pnpm prisma:migrate
pnpm prisma:studio
```

---

## 🧭 開発ルール（Contributing）

### 🔀 ブランチ運用

- `main` … 安定版
- `feat/*` … 機能追加
- `fix/*` … バグ修正
- `docs/*` … ドキュメント更新

### ✍️ コミットメッセージ

- Conventional Commits ベース
- 形式: `type(scope): 内容`
- 例:
  - `feat(entry): 支出記録画面を追加`
  - `fix(debt): Entryとの金額不一致を修正`

### ⚠️ 注意点

- PrismaとZodの型ズレに注意
- seedは `pnpm seed`
- Dev Container環境を前提に開発

---

## 📖 ドキュメント

すべて `docs/` フォルダに格納：

- [設計思想](docs/設計思想.md)
- [要件定義](docs/要件定義.md)
- [ユースケース一覧](docs/ユースケース一覧.md)
- [ドメインルール一覧](docs/ドメインルール一覧.md)
- [アーキテクチャ設計](docs/アーキテクチャ設計.md)
- [データモデル設計](docs/データモデル設計.md)
- [エラーハンドリング戦略](docs/エラーハンドリング戦略.md)
- [テスト戦略](docs/テスト戦略.md)
- [コーディング規約](docs/コーディング規約.md)

---

## 📝 備考

- 金融機関のローンなど制度化された借金管理は対象外です
- 個人間での善意・信頼ベースの貸借を記録・管理する用途に特化しています
