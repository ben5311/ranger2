import { ValidationAcceptor, ValidationChecks } from 'langium';

import { Issue, satisfies } from '../utils/types';
import * as ast from './generated/ast';
import { hasAList } from './ranger-generator';
import { RangerServices } from './ranger-module';
import { resolveReference } from './ranger-scope';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: RangerServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.RangerValidator;
    const checks: ValidationChecks<ast.RangerAstType> = {
        Document: [validator.checkDocument_NoDuplicateEntities, validator.checkDocument_EntityNamesStartsWithCapital],
        MapToList: [validator.checkMapToList_IsBasedOnAList],
        Objekt: [validator.checkObjekt_NoDuplicateProperties],
        PropertyReference: [validator.checkPropertyReference_NoCircularReferences],
    };
    registry.register(checks, validator);
}

export const Issues = satisfies<Record<string, Issue>>()({
    Document_DuplicateEntity: { code: 'Document.DuplicateEntity', msg: 'Duplicate Entity: ' },
    Entity_NameNotCapitalized: { code: 'Entity.NameNotCapitalized', msg: 'Entity name should start with a capital.' },
    MapToList_NotBasedOnAList: { code: 'MapToList.NotBasedOnAList', msg: 'Unsupported value source' },
    Objekt_DuplicateProperty: { code: 'Entity.DuplicateMember', msg: 'Duplicate Property:' },
    PropertyReference_CircularReference: { code: 'PropertyReference.CircularReference', msg: 'Circular reference' },
});

/**
 * Implementation of custom validations.
 */
export class RangerValidator {
    constructor(protected services: RangerServices) {}

    checkDocument_EntityNamesStartsWithCapital(document: ast.Document, accept: ValidationAcceptor): void {
        for (let entity of document.entities.filter((e) => e.name)) {
            const firstChar = entity.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', Issues.Entity_NameNotCapitalized.msg, {
                    node: entity,
                    property: 'name',
                    code: Issues.Entity_NameNotCapitalized.code,
                });
            }
        }
    }

    checkDocument_NoDuplicateEntities(document: ast.Document, accept: ValidationAcceptor) {
        const issue = Issues.Document_DuplicateEntity;
        const entities = document.entities;
        const duplicates = this.findDuplicates(entities);
        for (let dup of duplicates) {
            accept('error', `${issue.msg} [${dup.name}]`, { node: dup, property: 'name', code: issue.code });
        }
    }

    checkMapToList_IsBasedOnAList(mapFunc: ast.MapToList, accept: ValidationAcceptor): void {
        const issue = Issues.MapToList_NotBasedOnAList;
        const sourceValue = resolveReference(mapFunc.source);
        if (!hasAList(sourceValue)) {
            accept('error', issue.msg, { node: mapFunc, property: 'source', code: issue.code });
        }
    }

    checkObjekt_NoDuplicateProperties(objekt: ast.Objekt, accept: ValidationAcceptor): void {
        const issue = Issues.Objekt_DuplicateProperty;
        const duplicates = this.findDuplicates(objekt.properties);
        for (let dup of duplicates) {
            accept('error', `${issue.msg} [${dup.name}]`, { node: dup, property: 'name', code: issue.code });
        }
    }

    checkPropertyReference_NoCircularReferences(ref: ast.PropertyReference, accept: ValidationAcceptor): void {
        const issue = Issues.PropertyReference_CircularReference;
        resolveReference(ref, (_) => {
            accept('error', issue.msg, { node: ref, code: issue.code });
        });
    }

    findDuplicates<T extends { name: string }>(elements: T[]): T[] {
        return elements
            .groupBy((el) => el.name)
            .valuesArray()
            .filter((arr) => arr.length >= 2)
            .flat();
    }
}
