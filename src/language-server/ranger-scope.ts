import { DefaultScopeProvider, EMPTY_SCOPE, getContainerOfType, ReferenceInfo, Scope, StreamScope } from 'langium';
import { URI } from 'vscode-uri';

import { fileURI, resolvePath } from '../utils/documents';
import * as ast from './generated/ast';

/**
 * Implements Import mechanism and Class member scoping for Entities.
 *
 * Class member scoping allows to reference Properties from the current Objekt and any parent Objekts.
 *
 * Example:
 * -------
 * Entity Customer {
 *     id: 1
 *     account: {
 *         accountId: 2
 *         customerId: id       // Or: Customer.id
 *         balance1: 1000
 *         balance2: balance1   // Or: Customer.account.balance1 / account.balance1
 *     }
 * }
 *
 */
export class RangerScopeProvider extends DefaultScopeProvider {
    /**
     * Computes the elements that can be reached from a certain Reference context (aka The Scope).
     *
     * The Scope consists of:
     * 1. All Entities defined in the current Document.
     * 2. All Entities imported into the current Document.
     * 3. All Properties defined in the current or any parent Objekts.
     */
    override getScope(context: ReferenceInfo): Scope {
        if (ast.isPropertyReference(context.container) && context.property === 'element') {
            return this.getLocalScope(context.container, context);
        }
        return super.getScope(context);
    }

    /**
     * Resolves the child Properties that can be reached from a certain PropertyReference.
     */
    getLocalScope(reference: ast.PropertyReference, context: ReferenceInfo) {
        const previousElement = reference.previous?.element?.ref;
        if (!previousElement) {
            return super.getScope(context);
        }
        const resolvedValue = resolveReference(previousElement);
        return this.scopeValue(resolvedValue);
    }

    private scopeValue(value?: ast.Value): Scope {
        if (ast.isObjekt(value)) {
            return this.createScopeForNodes(value.properties);
        }
        // When the target of our reference isn't an Object, it must be a primitive type.
        // Simply return an empty scope
        return EMPTY_SCOPE;
    }

    /**
     * Resolves the Entities imported into the current Document.
     */
    override getGlobalScope(referenceType: string, context: ReferenceInfo): Scope {
        const document = getContainerOfType(context.container, ast.isDocument);
        if (!document) {
            return EMPTY_SCOPE;
        }

        const imports = new Map<string, string[]>();
        for (let imp of document.imports) {
            const filePath = resolvePath(imp.filePath.value, document);
            const fileUri = fileURI(filePath).toString();
            imports.set(fileUri, (imports.get(fileUri) || []).concat(imp.entities));
        }

        let importedElements = this.indexManager
            .allElements(referenceType)
            .filter((desc) => imports.get(desc.documentUri.toString())?.includes(desc.name));
        return new StreamScope(importedElements);
    }
}

/**
 * Resolves the Value behind a Property or PropertyReference.
 * Supports transitive references.
 */
export function resolveReference(element?: ValueOrProperty, onError?: (error: string) => void): ast.Value | undefined {
    let i = 1;
    while (ast.isProperty(element) || ast.isPropertyReference(element)) {
        element = ast.isProperty(element) ? element.value : element.element.ref;
        if (i++ >= 100) {
            onError = onError || console.log;
            onError(`Possibly circular refernce on [${element?.$cstNode?.text}]: Max reference depth exceeded`);
            return undefined;
        }
    }
    return element;
}

export type ValueOrProperty = ast.Value | ast.Property | ast.PropertyReference;
