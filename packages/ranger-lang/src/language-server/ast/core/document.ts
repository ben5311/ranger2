import { ValidationAcceptor } from 'langium';

import { findDuplicates } from '../../../utils/collections';
import { Document, Entity, PropertyReference } from '../../generated/ast';
import { resolvePath } from '../../ranger-documents';
import { findEntityDeclaration } from '../../ranger-scope';
import { Issues } from '../../ranger-validator';
import { Check, NoOpCompanion } from '../Companion';

export class DocumentCompanion extends NoOpCompanion {
    @Check
    noDuplicateEntities(document: Document, accept: ValidationAcceptor) {
        const issue = Issues.DuplicateEntity;
        const entities = this.scopeProvider.doGetScope(document, 'Entity').getAllElements().toArray();
        const duplicates = findDuplicates(entities);
        for (let dup of duplicates) {
            accept('error', `${issue.msg}: '${dup.name}'`, {
                ...findEntityDeclaration(dup.node as Entity, document)!,
                code: issue.code,
            });
        }
    }

    @Check
    noDuplicateImports(document: Document, accept: ValidationAcceptor) {
        const issue = Issues.DuplicateImport;
        const importedEntities: { name: string; node: PropertyReference }[] = [];

        for (let imp of document.imports) {
            for (let entityRef of imp.entities) {
                const absPath = resolvePath(imp.filePath, document);
                const entityName = entityRef.element.ref?.name;
                if (entityName) {
                    importedEntities.push({ name: `${absPath}$${entityName}`, node: entityRef });
                }
            }
        }

        const duplicates = findDuplicates(importedEntities, false);
        for (let dup of duplicates) {
            accept('warning', issue.msg, { node: dup.node, property: 'element', code: issue.code });
        }
    }
}
