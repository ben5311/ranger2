import { AstNode, DefaultDocumentSymbolProvider, LangiumDocument } from 'langium';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver';

import { getValue } from '../generator/ranger-generator';
import { isSimpleProperty } from '../utils/types';

export class RangerSymbolProvider extends DefaultDocumentSymbolProvider {
    override getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] {
        const node = astNode.$cstNode;
        const nameNode = this.nameProvider.getNameNode(astNode);
        if (nameNode && node) {
            const name = this.nameProvider.getName(astNode);
            const value = isSimpleProperty(astNode) ? getValue(astNode) : undefined;
            return [
                {
                    kind: this.getSymbolKind(astNode.$type),
                    name: name ?? nameNode.text,
                    detail: JSON.stringify(value),
                    range: node.range,
                    selectionRange: nameNode.range,
                    children: this.getChildSymbols(document, astNode),
                },
            ];
        } else {
            return this.getChildSymbols(document, astNode) || [];
        }
    }

    override getSymbolKind(type: string): SymbolKind {
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
}
