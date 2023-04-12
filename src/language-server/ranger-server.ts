import { DefaultLanguageServer } from 'langium';
import { InitializeParams, InitializeResult } from 'vscode-languageserver';

import { RangerServices } from './ranger-module';

export class RangerLanguageServer extends DefaultLanguageServer {
    override buildInitializeResult(_params: InitializeParams): InitializeResult {
        const result = super.buildInitializeResult(_params);
        result.capabilities.workspaceSymbolProvider = this.hasService(
            (e) => (e as RangerServices).workspace.WorkspaceSymbolProvider,
        );

        return result;
    }
}
