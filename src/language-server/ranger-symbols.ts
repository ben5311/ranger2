import { AstNode, DefaultDocumentSymbolProvider, LangiumDocument, MaybePromise } from 'langium';
import {
    CancellationToken,
    DocumentSymbol,
    SymbolKind,
    WorkspaceSymbol,
    WorkspaceSymbolParams,
} from 'vscode-languageserver';

import { isSimpleProperty } from '../utils/types';
import { getValueAsJson } from './ranger-generator';
import { RangerServices } from './ranger-module';

export class RangerDocumentSymbolProvider extends DefaultDocumentSymbolProvider {
    public override getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] {
        const node = astNode.$cstNode;
        const nameNode = this.nameProvider.getNameNode(astNode);
        if (nameNode && node) {
            const name = this.nameProvider.getName(astNode);
            const value = isSimpleProperty(astNode) ? getValueAsJson(astNode) : undefined;
            return [
                {
                    kind: this.getSymbolKind(astNode.$type),
                    name: name ?? nameNode.text,
                    detail: value,
                    range: node.range,
                    selectionRange: nameNode.range,
                    children: this.getChildSymbols(document, astNode),
                },
            ];
        } else {
            return this.getChildSymbols(document, astNode) || [];
        }
    }

    public override getSymbolKind(type: string): SymbolKind {
        return getSymbolKind(type);
    }
}

export class RangerWorkspaceSymbolProvider implements WorkspaceSymbolProvider {
    constructor(protected services: RangerServices) {
        services.shared.lsp.Connection?.onWorkspaceSymbol((params, token) => this.provideSymbols(params, token));
    }

    provideSymbols(_params: WorkspaceSymbolParams, _cancelToken?: CancellationToken) {
        const symbols: WorkspaceSymbol[] = [];
        for (const element of this.services.shared.workspace.IndexManager.allElements()) {
            symbols.push({
                name: element.name,
                kind: getSymbolKind(element.type),
                location: {
                    uri: element.documentUri.toString(),
                },
            });
        }
        return symbols;
    }
}

export function getSymbolKind(type: string): SymbolKind {
    switch (type) {
        case 'Entity':
        case 'Objekt':
            return SymbolKind.Class;
        case 'Property':
            return SymbolKind.Key;
        default:
            return SymbolKind.Field;
    }
}

export interface WorkspaceSymbolProvider {
    provideSymbols(
        params: WorkspaceSymbolParams,
        cancelToken?: CancellationToken,
    ): MaybePromise<WorkspaceSymbol[] | undefined>;
}
