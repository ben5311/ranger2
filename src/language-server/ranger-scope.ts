import {
    AstNodeDescription,
    DefaultScopeProvider,
    EMPTY_SCOPE,
    getContainerOfType,
    ReferenceInfo,
    Scope,
    stream,
    StreamScope,
} from 'langium';

import { fileURI, isRangerFile, resolvePath } from '../utils/documents';
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
     * 1. All Entities imported into the current Document.
     * 2. All Entities defined in the current Document.
     * 3. All Properties defined in the current or any parent Objekts.
     */
    override getScope(context: ReferenceInfo): Scope {
        const node = context.container;
        if (ast.isPropertyReference(node) && ast.isImport(node.$container)) {
            return this.getImportScope(node.$container, context);
        }
        if (ast.isPropertyReference(node) && context.property === 'element') {
            return this.getLocalScope(node, context);
        }
        return super.getScope(context);
    }

    /**
     * Resolves the Entities that can be imported from a specific Document.
     */
    getImportScope(imp: ast.Import, context: ReferenceInfo): Scope {
        const documentPath = resolvePath(imp.filePath.value, imp);
        const documentUri = fileURI(documentPath);

        if (!isRangerFile(documentUri)) {
            return EMPTY_SCOPE;
        }

        let documentEntities = this.indexManager
            .allElements(this.reflection.getReferenceType(context))
            .filter((desc) => desc.documentUri.toString() === documentUri.toString());

        return new StreamScope(documentEntities);
    }

    /**
     * Resolves the Entities imported into the current Document.
     */
    override getGlobalScope(_referenceType: string, context: ReferenceInfo): Scope {
        const document = getContainerOfType(context.container, ast.isDocument);
        if (!document) {
            return EMPTY_SCOPE;
        }

        const importedEntities: AstNodeDescription[] = [];
        for (let imp of document.imports) {
            for (let entityRef of imp.entities) {
                const entity = entityRef.element.ref;
                if (entity) {
                    importedEntities.push(this.descriptions.createDescription(entity, entity.name));
                }
            }
        }

        return new StreamScope(stream(importedEntities));
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
