import { defineConfig } from 'vite';
import postcss from 'rollup-plugin-postcss';
import monaco from 'rollup-plugin-monaco-editor';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import banner2 from 'rollup-plugin-banner2';
import dts from 'vite-plugin-dts';
import packageJson from './package.json';
import * as path from 'node:path';
import postcssUrl from 'postcss-url';
import fs from 'fs-extra';

const version = packageJson.version ?? null;

const prefix = `monaco-editor/esm/vs`;

// 更多插件和配置项可以根据需要添加
// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => `index.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      plugins: [
        banner2(
          () => `
"use client";

if (typeof window !== "undefined") {
  window.CODEIUM_REACT_CODE_VERSION = ${version ? `${JSON.stringify(version)}` : null};
}
      `,
        ),
      ],
    },
  },
});
