import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import { tsdoc } from "@typescript-eslint/tsdoc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals", 
    "next/typescript",
    "plugin:@typescript-eslint/recommended",
  ),
  {
    plugins: {
      tsdoc: tsdoc,
    },
    rules: {
      // 未使用の変数を警告
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_" 
      }],
      // 明示的な関数の戻り値の型を要求
      "@typescript-eslint/explicit-function-return-type": ["warn", {
        "allowExpressions": true,
        "allowTypedFunctionExpressions": true
      }],
      // nullチェックを強制
      "@typescript-eslint/no-non-null-assertion": "error",
      // 一貫した型のインポートを強制
      "@typescript-eslint/consistent-type-imports": ["error", { 
        "prefer": "type-imports" 
      }],
      // any型の使用を制限
      "@typescript-eslint/no-explicit-any": "warn",
      // コードスタイル
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      // TSDocルール
      "tsdoc/syntax": "warn"
    },
  },
];

export default eslintConfig;
