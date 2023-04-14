import {
    AstNode,
    DocumentationProvider,
    findDeclarationNodeAtOffset,
    GrammarConfig,
    LangiumDocument,
    LangiumServices,
    MaybePromise,
    References,
} from 'langium';
import { Hover, HoverParams } from 'vscode-languageserver';

import * as ast from './generated/ast';
import { getValueAsJson } from './ranger-generator';

export class RangerHoverProvider {
    protected readonly references: References;
    protected readonly grammarConfig: GrammarConfig;
    protected readonly documentationProvider: DocumentationProvider;

    constructor(services: LangiumServices) {
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
        this.documentationProvider = services.documentation.DocumentationProvider;
    }

    public getHoverContent(document: LangiumDocument, params: HoverParams): MaybePromise<Hover | undefined> {
        const rootNode = document.parseResult?.value?.$cstNode;
        if (rootNode) {
            const offset = document.textDocument.offsetAt(params.position);
            const cstNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
            if (cstNode && cstNode.offset + cstNode.length > offset && cstNode.element) {
                let hover = this.getAstNodeHoverContent(cstNode.element);
                if (hover) {
                    hover = typeof hover === 'object' ? hover : { contents: { kind: 'plaintext', value: hover } };
                    return hover;
                }
            }
        }
        return undefined;
    }

    /**
     * Returns Hover text for node.
     */
    public getAstNodeHoverContent(node: AstNode): Hover | string | undefined {
        if (ast.isCsvFunc(node)) {
            return `csv("${node.source.filePath}", delimiter="${node.delimiter}"${node.noHeader ? ', noHeader' : ''})`;
        }
        if (ast.isValue(node) || ast.isProperty(node) || ast.isPropertyReference(node)) {
            const value = getValueAsJson(node);
            return ast.isProperty(node) ? `${node.name}: ${value}` : value;
        }
        return undefined;
    }
}
