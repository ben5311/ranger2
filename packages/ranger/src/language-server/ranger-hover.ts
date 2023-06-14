import {
    AstNode,
    findDeclarationNodeAtOffset,
    GrammarConfig,
    HoverProvider,
    LangiumDocument,
    MaybePromise,
} from 'langium';
import { Hover, HoverParams } from 'vscode-languageserver';

import { highlighter } from './ast/CodeHighlighter';
import { RangerCompanions } from './ranger-companions';
import { RangerServices } from './ranger-module';

export class RangerHoverProvider implements HoverProvider {
    protected readonly grammarConfig: GrammarConfig;
    protected readonly companions: RangerCompanions;

    constructor(services: RangerServices) {
        this.grammarConfig = services.parser.GrammarConfig;
        this.companions = services.generator.Companions;
    }

    getHoverContent(document: LangiumDocument, params: HoverParams): MaybePromise<Hover | undefined> {
        const rootNode = document.parseResult?.value?.$cstNode;
        if (!rootNode) {
            return undefined;
        }

        const offset = document.textDocument.offsetAt(params.position);
        const cstNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
        const astNode = cstNode?.element;

        if (cstNode && cstNode.offset + cstNode.length > offset && astNode) {
            let hover = this.getAstNodeHover(astNode, highlighter);
            if (hover !== undefined) {
                return {
                    range: astNode.$cstNode?.range,
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
        return this.companions.get(node).hover(node, highlight);
    }
}
