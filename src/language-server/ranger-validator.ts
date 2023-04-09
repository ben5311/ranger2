import { ValidationAcceptor, ValidationChecks } from 'langium';

import { getValue } from '../generator/ranger-generator';
import { Issue, satisfies } from '../utils/types';
import { Document, isObjekt, Objekt, PropertyReference, RangerAstType } from './generated/ast';
import { Config } from './ranger-config';
import { RangerServices } from './ranger-module';
import { resolveValue } from './ranger-scope';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: RangerServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.RangerValidator;
    const checks: ValidationChecks<RangerAstType> = {
        Document: [validator.checkDocument_NoDuplicateEntities, validator.checkDocument_EntityNamesStartsWithCapital],
        Objekt: [validator.checkObjekt_NoDuplicateProperties, validator.checkObjekt_ShowDebugInfo],
        PropertyReference: [validator.checkPropertyReference_NoCircularReferences],
    };
    registry.register(checks, validator);
}

export const Issues = satisfies<Record<string, Issue>>()({
    Document_DuplicateEntity: { code: 'Document.DuplicateEntity', msg: 'Duplicate Entity: ' },
    Entity_NameNotCapitalized: { code: 'Entity.NameNotCapitalized', msg: 'Entity name should start with a capital.' },
    Objekt_DuplicateProperty: { code: 'Entity.DuplicateMember', msg: 'Duplicate Property:' },
    PropertyReference_CircularReference: { code: 'PropertyReference.CircularReference', msg: 'Circular reference' },
    DebugInfo: { code: 'DebugInfo', msg: '' },
});

/**
 * Implementation of custom validations.
 */
export class RangerValidator {
    checkDocument_EntityNamesStartsWithCapital(document: Document, accept: ValidationAcceptor): void {
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

    checkDocument_NoDuplicateEntities(document: Document, accept: ValidationAcceptor) {
        const issue = Issues.Document_DuplicateEntity;
        const entities = document.entities;
        const duplicates = this.findDuplicates(entities);
        for (let dup of duplicates) {
            accept('error', `${issue.msg} [${dup.name}]`, { node: dup, property: 'name', code: issue.code });
        }
    }

    checkObjekt_NoDuplicateProperties(objekt: Objekt, accept: ValidationAcceptor): void {
        const issue = Issues.Objekt_DuplicateProperty;
        const duplicates = this.findDuplicates(objekt.properties);
        for (let dup of duplicates) {
            accept('error', `${issue.msg} [${dup.name}]`, { node: dup, property: 'name', code: issue.code });
        }
    }

    checkObjekt_ShowDebugInfo(objekt: Objekt, accept: ValidationAcceptor): void {
        if (!Config.debug) return;
        for (let prop of objekt.properties.filter((p) => !isObjekt(p.value))) {
            let value = getValue(prop.value);
            if (value === undefined) return;
            accept('info', JSON.stringify(value), { node: prop, property: 'value', code: Issues.DebugInfo.code });
        }
    }

    checkPropertyReference_NoCircularReferences(ref: PropertyReference, accept: ValidationAcceptor): void {
        const issue = Issues.PropertyReference_CircularReference;
        resolveValue(ref, (_) => {
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
