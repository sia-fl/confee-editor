import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Document as DocumentInfo } from '../../api/proto/exa/language_server_pb/language_server_pb';
import { PromiseClient } from '@connectrpc/connect';
import { MonacoCompletionProvider } from './CompletionProvider';
import { LanguageServerService } from '../../api/proto/exa/language_server_pb/language_server_connect';
import { Status } from './CodeiumEditor';

declare module 'monaco-editor' {
  namespace editor {
    // noinspection JSUnusedGlobalSymbols
    interface ICodeEditor {
      _commandService: { executeCommand(command: string): unknown };
    }
  }
}

export class InlineCompletionProvider
  implements monaco.languages.InlineCompletionsProvider
{
  readonly completionProvider: MonacoCompletionProvider;

  constructor(
    grpcClient: PromiseClient<typeof LanguageServerService>,
    setCodeiumStatus?: (status: Status) => void,
    apiKey?: string | undefined,
    multilineModelThreshold?: number | undefined,
  ) {
    this.completionProvider = new MonacoCompletionProvider(
      grpcClient,
      setCodeiumStatus,
      apiKey,
      multilineModelThreshold,
    );
  }

  freeInlineCompletions() {
    // nothing
  }

  async provideInlineCompletions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    _context: monaco.languages.InlineCompletionContext,
    token: monaco.CancellationToken,
  ) {
    return await this.completionProvider.provideInlineCompletions(
      model,
      position,
      token,
    );
  }

  public acceptedLastCompletion(completionId: string) {
    this.completionProvider.acceptedLastCompletion(completionId);
  }

  public updateOtherDocuments(otherDocuments: DocumentInfo[]) {
    this.completionProvider.otherDocuments = otherDocuments;
  }
}
