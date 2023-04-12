import { AstNode, AstNodeHoverProvider, DocumentationProvider, LangiumServices, MaybePromise } from 'langium';
import { Hover } from 'vscode-languageserver';

import { isProperty, isPropertyReference, isValue } from './generated/ast';
import { getValueAsJson } from './ranger-generator';

export class RangerHoverProvider extends AstNodeHoverProvider {
    protected readonly documentationProvider: DocumentationProvider;

    constructor(services: LangiumServices) {
        super(services);
        this.documentationProvider = services.documentation.DocumentationProvider;
    }

    /**
     * Returns generated Value on hover over Property.
     */
    public getAstNodeHoverContent(node: AstNode): MaybePromise<Hover | undefined> {
        if (isValue(node) || isProperty(node) || isPropertyReference(node)) {
            const value = getValueAsJson(node);
            if (value !== undefined) {
                return {
                    contents: {
                        kind: 'plaintext',
                        value: isProperty(node) ? `${node.name}: ${value}` : value,
                    },
                };
            }
        }
        return undefined;
    }
}
