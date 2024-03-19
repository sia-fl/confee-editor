'use client';
import styles from './page.module.css';
import dynamic from 'next/dynamic';
import '../../dist/style.css';
import { Suspense } from 'react';

const Editor = dynamic(() => import('../../dist'), { ssr: false });

export default function Home() {
  return (
    <main className={styles.main}>
      <Suspense>
        <Editor
          packages={[
            'https://deno.land/x/hono@v4.1.0/mod.ts',
            'https://deno.land/x/doa@v1.0.0/mod.ts',
            'https://cdn.jsdelivr.net/npm/kysely/dist/esm/index.js',
          ]}
          language="typescript"
        />
      </Suspense>
    </main>
  );
}
