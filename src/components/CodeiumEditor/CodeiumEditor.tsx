'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createConnectTransport } from '@connectrpc/connect-web';
import { createPromiseClient } from '@connectrpc/connect';
import { EditorProps, Monaco } from '@monaco-editor/react';
import { LanguageServerService } from '../../api/proto/exa/language_server_pb/language_server_connect';
import { InlineCompletionProvider } from './InlineCompletionProvider';
import { Document } from '../../models';
import { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import getModels = editor.getModels;

export interface CodeiumEditorProps extends EditorProps {
  language: string;
  /**
   * 用于检测何时接受完成的可选回调。包括接受的完成文本。
   */
  onAutocomplete?: (acceptedText: string) => void;
  /**
   * 语言服务器的可选地址。大多数用例不需要这样做。默认为 Codeium 的语言服务器。
   */
  languageServerAddress?: string;
  /**
   * 工作区中其他文档的可选列表。这可以用来提供额外的 Codeium 的上下文不仅仅是当前文档。中型的数量限制为 10 个文件。
   */
  otherDocuments?: Document[];
  /**
   * 容器的可选类名。
   */
  containerClassName?: string;
  /**
   * 容器的可选样式。
   */
  containerStyle?: React.CSSProperties;
  /**
   * 可选的多线模型阈值。大多数用例不需要。0-1之间的数值，越高=单行越多，越低=多行越多，0.0 = 仅多行。
   */
  multilineModelThreshold?: number;
  /**
   * 当编辑器状态变更时的回调。
   * @param status
   */
  onCompletionStatusChange?: (status: Status) => void;
  /**
   * 要安装哪些包
   */
  packages?: string[];
  /**
   * 导入包的模式，是全量导入还是只导入主包
   */
  importMode?: 'full' | 'main';
  /**
   * 隐藏部分
   */
  hiddenPart?: string;
  /**
   * 隐藏部分是否作为 values 返回
   */
  hiddenPartAsValues?: boolean;
  modelPathname?: string;
}

export enum Status {
  INACTIVE = 'inactive',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export const CodeiumEditor: React.FC<CodeiumEditorProps> = ({
  languageServerAddress = 'https://web-backend.codeium.com',
  otherDocuments = [],
  containerClassName = '',
  containerStyle = {},
  packages,
  importMode = 'main',
  hiddenPart,
  modelPathname = 'file:///main.ts',
  ...props
}) => {
  const monacoRef = useRef<Monaco | null>(null);
  const inlineCompletionsProviderRef = useRef<InlineCompletionProvider | null>(
    null,
  );
  const [acceptedCompletionCount, setAcceptedCompletionCount] = useState(-1);

  const transport = useMemo(() => {
    return createConnectTransport({
      baseUrl: languageServerAddress,
      useBinaryFormat: true,
    });
  }, [languageServerAddress]);

  const grpcClient = useMemo(() => {
    return createPromiseClient(LanguageServerService, transport);
  }, [transport]);

  inlineCompletionsProviderRef.current = useMemo(() => {
    return new InlineCompletionProvider(
      grpcClient,
      props.onCompletionStatusChange,
      undefined,
      props.multilineModelThreshold,
    );
  }, []);

  // Keep other documents up to date.
  useEffect(() => {
    if (
      monacoRef.current !== null &&
      inlineCompletionsProviderRef.current !== null
    ) {
      /**
       * 在 create 以前
       */
      window.MonacoEnvironment = {
        async getWorker() {
          return new (
            await import(
              // noinspection ES6ShorthandObjectProperty
              // @ts-ignore
              'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
            )
          ).default();
        },
      };
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        moduleResolution:
          monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        strict: true,
        noImplicitAny: true,
      });
      const models = monaco.editor.getModels();
      let model: editor.ITextModel = null as unknown as any;
      for (const m of models) {
        if (m.uri.toString() === modelPathname) {
          model = m;
          break;
        }
      }
      if (!model) {
        model = monaco.editor.createModel(
          ``,
          'typescript',
          monaco.Uri.parse(modelPathname),
        );
      }
      const editor = monaco.editor.create(monacoRef.current as any, {
        model,
        fontFamily: '"Jetbrains Mono", Courier, Consolas, monospace',
        automaticLayout: true,
        minimap: { enabled: false },
        glyphMargin: false,
        guides: {
          indentation: true,
        },
      });
      const providerDisposable =
        monaco.languages.registerInlineCompletionsProvider(
          { pattern: '**' },
          inlineCompletionsProviderRef.current as any,
        );
      const completionDisposable = monaco.editor.registerCommand(
        'codeium.acceptCompletion',
        (_: unknown, completionId: string, insertText: string) => {
          try {
            if (props.onAutocomplete) {
              props.onAutocomplete(insertText);
            }
            setAcceptedCompletionCount(acceptedCompletionCount + 1);
            inlineCompletionsProviderRef.current?.acceptedLastCompletion(
              completionId,
            );
          } catch (err) {
            console.log('Err');
          }
        },
      );
      const values = (hiddenPart || '') + props.value;
      editor.setValue(values || '');
      if (hiddenPart) {
        const end = hiddenPart.split('\n').length - 1;
        // @ts-ignore
        editor.setHiddenAreas([
          {
            startLineNumber: 1,
            startColumn: 0,
            endLineNumber: end,
            endColumn: 0,
          },
        ]);
        editor.getModel()!.onDidChangeContent((e) => {
          if (e.isUndoing || e.isRedoing || e.isEolChange) {
            return;
          }
          const changes = e.changes.filter((it) => {
            return it.range.startLineNumber < end;
          });
          if (changes.length === 0) {
            return;
          }
          editor.trigger(null, 'undo', null);
          changes
            .filter((it) => {
              return it.range.startLineNumber === it.range.endLineNumber;
            })
            .forEach((it) => {
              editor.executeEdits(null, [
                {
                  range: {
                    startColumn: 1,
                    endColumn: 1,
                    endLineNumber: end + 1,
                    startLineNumber: end + 1,
                  },
                  text: it.text.trimStart(),
                },
              ]);
            });
        });
        editor.onKeyDown((e) => {
          // prevent backspace
          if (e.keyCode === 1) {
            const selection = editor.getSelection();
            if (!selection) {
              return;
            }
            if (
              selection.startLineNumber === selection.endLineNumber &&
              selection.startColumn === selection.endColumn &&
              selection.startLineNumber === end + 1 &&
              selection.startColumn === 1
            ) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
          // custom ctrl + a
          if (e.keyCode === 31 && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            editor.setSelection({
              startLineNumber: hiddenPart.split('\n').length,
              endLineNumber: 9999,
              startColumn: 1,
              endColumn: 9999,
            });
          }
        });
      }

      model.onDidChangeContent((e) => {
        const change = e.changes[0]?.text;
        if (!change) {
          return;
        }
        if (["'", '"'].findIndex((it) => change.startsWith(it)) !== -1) {
          setTimeout(() => {
            editor.trigger(null, 'editor.action.triggerSuggest', null);
          }, 200);
        }
      });

      /**
       * 在 create 以后
       */
      try {
        // await grpcClient.getCompletions({}).then(() => {});
        inlineCompletionsProviderRef.current?.updateOtherDocuments(
          otherDocuments,
        );
        if (props.onMount) {
          props.onMount(editor, monaco);
        }
      } catch (e) {
        // This is expected.
      }

      return () => {
        providerDisposable.dispose();
        completionDisposable.dispose();
      };
    }
  }, [monacoRef.current]);

  useEffect(() => {
    /**
     * 请求 http://192.168.99.190:4999/esm/types
     * json 格式，传递 pathnames
     */
    if (packages) {
      const dependencies: Record<string, any> = {};
      if (importMode === 'main') {
        for (const v of packages) {
          dependencies[v] = '*';
        }
      }
      // 先判断浏览器缓存是否存在
      const cached = localStorage.getItem('cachedPackages');
      const cachedPackages: Record<
        string,
        {
          specifier: string;
          data: string;
        }[]
      > = {};
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (Array.isArray(data)) {
            data.map((it) => {
              cachedPackages[it] = it;
            });
          }
        } catch (e) {
          console.log(e);
        }
      }
      // 计算出需要请求的包
      const needRequest = packages.filter((it) => {
        return !cachedPackages[it];
      });
      if (needRequest.length === 0) {
        for (const pk in cachedPackages) {
          const ps: {
            specifier: string;
            data: string;
          }[] = cachedPackages[pk];
          for (const p in ps) {
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
              ps[p].data,
              ps[p].specifier,
            );
          }
        }
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          JSON.stringify({
            dependencies,
          }),
          'file:///package.json',
        );
        return;
      }
      const url = 'http://192.168.99.190:4999/esm/types';
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pathnames: needRequest,
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          const data: Record<
            string,
            {
              specifier: string;
              data: string;
            }[]
          > = res.data;
          for (const key in data) {
            const ps = data[key];
            for (const p in ps) {
              monaco.languages.typescript.typescriptDefaults.addExtraLib(
                ps[p].data,
                ps[p].specifier,
              );
              if (importMode === 'full') {
                dependencies[ps[p].specifier] = '*';
              }
            }
          }
          monaco.languages.typescript.typescriptDefaults.addExtraLib(
            JSON.stringify({ dependencies }),
            'file:///package.json',
          );
          // 缓存到浏览器
          localStorage.setItem('cachedPackages', JSON.stringify(data));
        });
    }

    return () => {
      // 将 modelPathname 的 model 从内存中移除
      monaco.editor.getModels().forEach((it) => {
        if (it.uri.toString() === modelPathname) {
          console.log('dispose', it.uri.toString());
          it.dispose();
        }
      });
    };
  }, [packages]);

  return (
    <div>
      <div
        style={{
          width: props.width || '100%',
          height: props.height || '300px',
          position: 'relative',
          ...containerStyle,
        }}
        className={containerClassName}
        ref={monacoRef as any}
      ></div>
      <button
        onClick={() => {
          monaco.editor.getModelMarkers({});
        }}
      >
        okj
      </button>
    </div>
  );
};
