import { AstNode, DefaultDocumentSymbolProvider, LangiumDocument } from 'langium';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver';

import { isSimpleProperty } from './ast/core/propertyChecks';
import { RangerType } from './ast/Providers';
import * as ast from './generated/ast';
import { hasErrors } from './ranger-documents';
import { RangerGenerator } from './ranger-generator';
import { RangerServices } from './ranger-module';
import { resolveReference } from './ranger-scope';

export class RangerDocumentSymbolProvider extends DefaultDocumentSymbolProvider {
    generator: RangerGenerator;

    constructor(protected services: RangerServices) {
        super(services);
        this.generator = services.generator.Generator;
    }

    public override getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] {
        if (hasErrors(document)) {
            return [];
        }

        const node = astNode.$cstNode;
        const nameNode = this.nameProvider.getNameNode(astNode);
        if (nameNode && node) {
            const name = this.nameProvider.getName(astNode);
            const value = isSimpleProperty(astNode) ? this.generator.getValueAsJson(astNode) : undefined;
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
