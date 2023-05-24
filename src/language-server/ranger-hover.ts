import {
    AstNode,
    DocumentationProvider,
    findDeclarationNodeAtOffset,
    GrammarConfig,
    HoverProvider,
    LangiumDocument,
    LangiumServices,
    MaybePromise,
    References,
} from 'langium';
import { Hover, HoverParams } from 'vscode-languageserver';

import { highlighter } from './ast/CodeHighlighter';
import { Companions, createCompanions } from './ast/registry';
import { generator } from './ranger-generator';

export class RangerHoverProvider implements HoverProvider {
    protected readonly references: References;
    protected readonly grammarConfig: GrammarConfig;
    protected readonly documentationProvider: DocumentationProvider;
    protected readonly companions: Companions;

    constructor(services: LangiumServices) {
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
        this.documentationProvider = services.documentation.DocumentationProvider;
        this.companions = createCompanions(generator);
    }

    getHoverContent(document: LangiumDocument, params: HoverParams): MaybePromise<Hover | undefined> {
        const rootNode = document.parseResult?.value?.$cstNode;
        if (!rootNode) {
            return undefined;
        }

        const offset = document.textDocument.offsetAt(params.position);
        const cstNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);

        if (cstNode && cstNode.offset + cstNode.length > offset && cstNode.element) {
            let hover = this.getAstNodeHover(cstNode.element, highlighter);
            if (hover !== undefined) {
                return {
                    range: cstNode.range,
                    contents: {
                        kind: 'markdown',
                        value: hover,
                    },
                };
            }
        }

        return undefined;
    }

    /**
     * Returns Hover text for node.
     */
    getAstNodeHover(node: AstNode, highlight = highlighter): string | undefined {
        return this.companions.get(node)?.hover(node, highlight);
    }
}
