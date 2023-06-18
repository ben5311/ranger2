import {
    AstNode,
    AstNodeDescription,
    DefaultScopeProvider,
    EMPTY_SCOPE,
    getContainerOfType,
    getDiagnosticRange,
    getDocument,
    isAstNode,
    ReferenceInfo,
    Scope,
    Stream,
    stream,
    StreamScope,
} from 'langium';
import { isObject } from 'lodash';
import { Range } from 'vscode-languageserver';

import { RangerType } from './ast/Providers';
import * as ast from './generated/ast';
import { fileURI, isRangerFile, resolvePath } from './ranger-documents';
import { RangerGenerator } from './ranger-generator';
import { RangerServices } from './ranger-module';

/**
 * Implements Import mechanism and Class member scoping for Entities.
 *
 * Class member scoping allows to reference Properties from the current and any parent Objects.
 *
 * @example
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
    generator: RangerGenerator;

    constructor(protected services: RangerServices) {
        super(services);
        this.generator = services.generator.Generator;
    }

    /**
     * Computes the elements that can be reached from a certain reference context (aka The Scope).
     */
    override getScope(context: ReferenceInfo): Scope {
        const node = context.container;
        const referenceType = this.reflection.getReferenceType(context) as RangerType;

        if (ast.isImport(node.$container) && ast.isPropertyReference(node)) {
            return this.getImportScope(node.$container, referenceType);
        }
        if (ast.isPropertyReference(node) && context.property === 'element') {
            return this.getPropertyReferenceScope(node, referenceType);
        }
        return this.doGetScope(node, referenceType);
    }

    /**
     * Computes the elements that can be reached from a certain node (aka The Scope).
     *
     * The Scope consists of:
     * 1. All Entities imported into the current Document.
     * 2. All Entities defined in the current Document.
     * 3. All Properties defined in the current and any parent node.
     */
    doGetScope(node: AstNode, referenceType: RangerType = 'Property'): Scope {
        // The global Scope contains all imported Entities
        const globalScope = this.getGlobalScope(referenceType, node);

        // The precomputed Scopes contain all Entities and Properties defined in the current Document
        const precomputedScopes = getDocument(node).precomputedScopes;

        if (!precomputedScopes) {
            return globalScope;
        }

        const localScopes: Array<Stream<AstNodeDescription>> = [];

        let currentNode: AstNode | undefined = node;
        do {
            // Collect the node's local Scope
            let localScope = stream(precomputedScopes.get(currentNode) || []);
            localScope = localScope.filter((desc) => this.reflection.isSubtype(desc.type, referenceType));
            localScopes.push(localScope);

            // Traverse through all the parent nodes and collect their local Scopes
            currentNode = currentNode.$container;
        } while (currentNode);

        // Merge global Scope and local Scopes
        let result: Scope = globalScope;
        for (let i = localScopes.length - 1; i >= 0; i--) {
            result = this.createScope(localScopes[i], result);
        }
        return result;
    }

    /**
     * Resolves the Entities imported into the current Document.
     */
    override getGlobalScope(_referenceType: string, context: AstNode | ReferenceInfo): Scope {
        const node = isAstNode(context) ? context : context.container;
        const document = getContainerOfType(node, ast.isDocument);
        if (!document) {
            return EMPTY_SCOPE;
        }

        const importedEntities = new Set<ast.Entity>();
        for (let imp of document.imports) {
            for (let entityRef of imp.entities) {
                const entity = entityRef.element.ref;
                if (entity) {
                    importedEntities.add(entity as ast.Entity);
                }
            }
        }

        const descriptions = stream(importedEntities).map((e) => this.descriptions.createDescription(e, e.name));
        return new StreamScope(descriptions);
    }

    /**
     * Resolves the Entities that can be imported from a specific Document.
     */
    getImportScope(imp: ast.Import, referenceType: RangerType = 'Entity'): Scope {
        const documentPath = resolvePath(imp.filePath.value, imp);
        const documentUri = fileURI(documentPath);

        if (!isRangerFile(documentUri)) {
            return EMPTY_SCOPE;
        }

        let documentEntities = this.indexManager
            .allElements(referenceType)
            .filter((desc) => desc.documentUri.toString() === documentUri.toString());

        return new StreamScope(documentEntities);
    }

    /**
     * Resolves the child Properties that can be reached from a certain PropertyReference.
     */
    getPropertyReferenceScope(propRef: ast.PropertyReference, referenceType: RangerType = 'PropertyReference') {
        const previousElement = propRef.previous?.element?.ref;
        if (!previousElement) {
            return this.doGetScope(propRef, referenceType);
        }

        const resolvedValue = resolveReference(previousElement);
        return this.scopeValue(resolvedValue, propRef);
    }

    protected scopeValue(value: ast.Value | undefined, propRef: ast.PropertyReference): Scope {
        if (!value) {
            return EMPTY_SCOPE;
        }

        if (ast.isObjekt(value)) {
            return this.createScopeForNodes(value.properties);
        }

        let generated = this.generator.getValue(value);
        if (isObject(generated)) {
            return this.createPropertyExtractors(value, generated, propRef);
        }

        // When the target of our reference isn't an Object, it must be a primitive type and has no scope
        return EMPTY_SCOPE;
    }

    protected createPropertyExtractors(value: ast.Value, generated: object, propRef: ast.PropertyReference): Scope {
        const descriptions = stream(Object.keys(generated))
            .filter((k) => k.match(/[_a-zA-Z][\w_]*/))
            .map((key) => {
                const extractor: ast.PropertyExtractor = {
                    $container: propRef,
                    $containerProperty: 'element',
                    $type: 'PropertyExtractor',
                    $cstNode: value.$cstNode,
                    source: value,
                    name: key,
                };
                return this.descriptions.createDescription(extractor, key);
            });
        return new StreamScope(descriptions);
    }
}

/**
 * Resolves the Value behind a Property or PropertyReference.
 * Supports transitive references.
 */
export function resolveReference(
    element?: ast.ValueOrProperty,
    onError: (error: string) => void = console.log,
): ast.Value | undefined {
    let i = 1;
    while (ast.isProperty(element) || ast.isPropertyReference(element)) {
        element = ast.isProperty(element) ? element.value : element.element.ref;
        if (i++ >= 100) {
            onError(`Possibly circular reference on [${element?.$cstNode?.text}]: Max reference depth exceeded`);
            return undefined;
        }
    }
    return element;
}

export type DeclarationInfo = { node: AstNode; range: Range };

/**
 * Locates the declaration of an Entity within the current Document.
 */
export function findEntityDeclaration(entity: ast.Entity, context: AstNode): DeclarationInfo | undefined {
    const currentDocument = getDocument<ast.Document>(context);
    const sourceDocument = getDocument<ast.Document>(entity);
    if (currentDocument.uri.toString() === sourceDocument.uri.toString()) {
        // Entity is defined in the current document
        return { node: entity, range: getDiagnosticRange({ node: entity, property: 'name' }) };
    } else {
        // Entity is imported from another document
        for (let imp of currentDocument.parseResult.value.imports) {
            for (let entityRef of imp.entities) {
                if (entity === entityRef.element.ref) {
                    return { node: entityRef, range: getDiagnosticRange({ node: entityRef }) };
                }
            }
        }
    }
    return undefined;
}
