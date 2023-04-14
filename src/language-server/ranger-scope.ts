import { DefaultScopeProvider, EMPTY_SCOPE, ReferenceInfo, Scope } from 'langium';

import * as ast from './generated/ast';

export class RangerScopeProvider extends DefaultScopeProvider {
    override getScope(context: ReferenceInfo): Scope {
        if (ast.isPropertyReference(context.container) && context.property === 'element') {
            const propertyReference = context.container;
            const previousElement = propertyReference.previous?.element?.ref;
            if (!previousElement) {
                return super.getScope(context);
            }
            const resolved = resolveReference(previousElement);
            return this.scopeValue(resolved);
        }
        return super.getScope(context);
    }

    private scopeValue(value?: ast.Value): Scope {
        if (ast.isObjekt(value)) {
            return this.createScopeForNodes(value.properties);
        }
        // When the target of our reference isn't an Object, it must be a primitive type.
        // Simply return an empty scope
        return EMPTY_SCOPE;
    }
}

/**
 * Resolves the Value behind a Property or PropertyReference.
 * Supports transitive references.
 */
export function resolveReference(element?: ValueOrProperty, onError?: (errorMsg: string) => void): Value | undefined {
    let i = 1;
    while (ast.isProperty(element) || ast.isPropertyReference(element)) {
        element = ast.isProperty(element) ? element.value : element.element.ref;
        if (i++ >= 100) {
            const name = ast.isProperty(element) ? element.name : undefined;
            onError = onError || console.log;
            onError(`Possibly circular refernce on [${name}]: Max reference depth exceeded`);
            return undefined;
        }
    }
    return element;
}

export type ValueOrProperty = ast.Value | ast.Property | ast.PropertyReference;
