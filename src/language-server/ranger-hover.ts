import { AstNode, AstNodeHoverProvider, DocumentationProvider, LangiumServices, MaybePromise } from 'langium';
import { Hover } from 'vscode-languageserver';

import { getValue } from '../generator/ranger-generator';
import { isPureProperty } from '../utils/types';
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
            const prefix = isPureProperty(node) ? `${node.name}: ` : '';
            return {
                contents: {
                    kind: 'plaintext',
                    value: prefix + JSON.stringify(value),
                },
            };
        }
        return undefined;
    }
}
