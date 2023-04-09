import { AstNode, AstNodeHoverProvider, DocumentationProvider, LangiumServices, MaybePromise } from 'langium';
import { Hover } from 'vscode-languageserver';

import { isPureProperty } from '../utils/types';
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
    protected getAstNodeHoverContent(node: AstNode): MaybePromise<Hover | undefined> {
        if (isValue(node) || isProperty(node) || isPropertyReference(node)) {
            const value = getValueAsJson(node);
            const prefix = isPureProperty(node) ? `${node.name}: ` : '';
            return {
                contents: {
                    kind: 'plaintext',
                    value: prefix + value,
                },
            };
        }
        return undefined;
    }
}
