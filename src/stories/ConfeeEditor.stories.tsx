// noinspection JSUnusedGlobalSymbols

import type { Meta, StoryObj } from '@storybook/react';

import { ConfeeEditor } from '../components/Editor/ConfeeEditor';
import { makeQueryEditorHeader } from '../libs/kyely';
import { Document, Language } from '../models';
import React, { useState } from 'react';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof ConfeeEditor> = {
  title: 'Example/Editor',
  component: (props) => {
    const [v, setV] = useState(
      '\
// 上文已经注册 db 对象\
',
    );

    return (
      <ConfeeEditor
        {...props}
        value={v}
        onChange={(v2) => {
          setV(v2 as string);
        }}
      />
    );
  },
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {},
} satisfies Meta<typeof ConfeeEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

const baseParams = {
  width: '700px',
  height: '500px',
};

export const TypescriptEdit: Story = {
  args: {
    ...baseParams,
    packages: [
      'https://deno.land/x/hono@v4.1.0/mod.ts',
      'https://deno.land/x/doa@v1.0.0/mod.ts',
      'https://cdn.jsdelivr.net/npm/kysely/dist/esm/index.js',
    ],
    value:
      '\
',
  },
};

export const TypescriptContext: Story = {
  args: {
    ...baseParams,
    packages: [
      'https://deno.land/x/hono@v4.1.0/mod.ts',
      'https://deno.land/x/doa@v1.0.0/mod.ts',
      'https://cdn.jsdelivr.net/npm/kysely/dist/esm/index.js',
    ],
    hiddenPart: makeQueryEditorHeader(),
    value:
      '\
// 上文已经注册 db 对象\
',
  },
};

export const HTMLEditor: Story = {
  args: {
    ...baseParams,
    language: 'html',
    value: `<html lang="en">Hello word</html>`,
  },
};

const HTML_SNIPPET = `\
通过 typescript 实现验证规则
返回类型要匹配
interface Result {
  success: boolean;
  message?: string;
}
下方关键字为 api 获取后动态替换。
关键字为：邮箱

请以关键字为中心，通过正则、长度、及其他不同的维度判断，返回不同的结果。
不能直接返回成功
`;

export const MultiFileContext: Story = {
  decorators: (Story) => (
    <div>
      <code>
        <pre>{HTML_SNIPPET}</pre>
      </code>
      <div>
        <h3>Context Aware Editor</h3>
        <Story />
      </div>
    </div>
  ),
  args: {
    ...baseParams,
    language: 'typescript',
    options: {
      scrollbar: {
        vertical: 'hidden',
      },
    },
    hiddenPart: `\
interface Result {
  success: boolean;
  message?: string;
}
`,
    value: `\
function validate(v: any) {
  // 正则判断
  // 长度判断
  // 其他判断
  return {
    success: true,
    message: 'success'
  }
}
`,
    otherDocuments: [
      new Document({
        absolutePath: '/index.txt',
        relativePath: 'index.txt',
        text: HTML_SNIPPET,
        editorLanguage: 'typescript',
        language: Language.TYPESCRIPT,
      } as unknown as any),
    ],
  },
};
