import { AstNode, DefaultDocumentSymbolProvider, LangiumDocument, MaybePromise } from 'langium';
import {
    CancellationToken,
    DocumentSymbol,
    SymbolKind,
    WorkspaceSymbol,
    WorkspaceSymbolParams,
} from 'vscode-languageserver';

import { hasErrors } from '../utils/documents';
import { isSimpleProperty } from './ast/core/propertyChecks';
import { RangerType } from './ast/Providers';
import * as ast from './generated/ast';
import { generator } from './ranger-generator';
import { RangerServices } from './ranger-module';
import { resolveReference } from './ranger-scope';

export class RangerDocumentSymbolProvider extends DefaultDocumentSymbolProvider {
    public override getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] {
        if (hasErrors(document)) {
            return [];
        }

        const node = astNode.$cstNode;
        const nameNode = this.nameProvider.getNameNode(astNode);
        if (nameNode && node) {
            const name = this.nameProvider.getName(astNode);
            const value = isSimpleProperty(astNode) ? generator.getValueAsJson(astNode) : undefined;
            return [
                {
                    kind: getSymbolKind(astNode.$type as RangerType),
                    name: name ?? nameNode.text,
                    detail: value,
                    range: node.range,
                    selectionRange: nameNode.range,
                    children: this.getChildSymbols(document, astNode),
                },
            ];
        } else if (ast.isPropertyReference(astNode) && ast.isProperty(astNode.$container)) {
            const value = resolveReference(astNode);
            return value ? this.getSymbol(document, value) : [];
        } else {
            return this.getChildSymbols(document, astNode) || [];
        }
    }
}

export function getSymbolKind(type: RangerType): SymbolKind {
    switch (type) {
        case 'Entity':
        case 'Objekt':
            return SymbolKind.Class;
        case 'Property':
            return SymbolKind.Field;
        default:
            return SymbolKind.Field;
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
                kind: getSymbolKind(element.type as RangerType),
                location: {
                    uri: element.documentUri.toString(),
                },
            });
        }
        return symbols;
    }
}

export interface WorkspaceSymbolProvider {
    provideSymbols(
        params: WorkspaceSymbolParams,
        cancelToken?: CancellationToken,
    ): MaybePromise<WorkspaceSymbol[] | undefined>;
}
