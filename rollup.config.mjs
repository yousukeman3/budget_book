import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { bundlerModuleNameResolver } from 'typescript';

export default {
  input: 'src/app/main.ts',  // エントリポイント
  output: {
    file: 'dist/main.js',
    format: 'esm',          // GAS でグローバル関数として動作させるため IIFE 形式
    name: 'budgetBook',      // グローバル変数名
  },
  treeshake: false,
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "tsconfig.json"
    })
  ]
};