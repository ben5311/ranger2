import { DefaultScopeProvider, EMPTY_SCOPE, ReferenceInfo, Scope } from 'langium';

import { isObjekt, isPropertyReference, PropertyReference, Value } from './generated/ast';

export class RangerScopeProvider extends DefaultScopeProvider {
    override getScope(context: ReferenceInfo): Scope {
        if (isPropertyReference(context.container) && context.property === 'element') {
            const propertyReference = context.container;
            const previousElement = propertyReference.previous?.element?.ref;
            if (!previousElement) {
                return super.getScope(context);
            }
            const previousValue = previousElement.value;
            return this.scopeValue(previousValue);
        }
        return super.getScope(context);
    }

    private scopeValue(value: Value | PropertyReference): Scope {
        if (isObjekt(value)) {
            return this.createScopeForNodes(value.properties);
        }
        // When the target of our reference isn't an Object, it must be a primitive type.
        // Simply return an empty scope
        return EMPTY_SCOPE;
    }
}
