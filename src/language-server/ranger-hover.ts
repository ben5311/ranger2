import { AstNode, AstNodeHoverProvider, DocumentationProvider, LangiumServices, MaybePromise } from 'langium';
import { Hover } from 'vscode-languageserver';

import { getValue } from '../generator/ranger-generator';
import { isProperty, isPropertyReference, isValue } from './generated/ast';

export class RangerHoverProvider extends AstNodeHoverProvider {
    protected readonly documentationProvider: DocumentationProvider;

    constructor(services: LangiumServices) {
        super(services);
        this.documentationProvider = services.documentation.DocumentationProvider;
    }

    /**
     * Returns generated Value on hover over Property.
     */
    protected getAstNodeHoverContent(node: AstNode): MaybePromise<Hover | undefined> {
        if (isValue(node) || isProperty(node) || isPropertyReference(node)) {
            const value = getValue(node);
            return {
                contents: {
                    kind: 'plaintext',
                    value: JSON.stringify(value),
                },
            };
        }
        return undefined;
    }
}
