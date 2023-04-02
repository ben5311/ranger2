import { ValidationAcceptor, ValidationChecks } from 'langium';

import { Issue, satisfies } from '../utils/types';
import { Document, Entity, isLiteral, RangerAstType } from './generated/ast';
import { Config } from './ranger-config';
import { RangerServices } from './ranger-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: RangerServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.RangerValidator;
    const checks: ValidationChecks<RangerAstType> = {
        Document: [validator.checkDocument_NoDuplicateEntities],
        Entity: [
            validator.checkEntity_NameStartsWithCapital,
            validator.checkEntity_NoDuplicateMembers,
            validator.checkEntity_ShowDebugInfo,
        ],
    };
    registry.register(checks, validator);
}

export const Issues = satisfies<Record<string, Issue>>()({
    Document_DuplicateEntity: { code: 'Document.DuplicateEntity', msg: 'Duplicate Entity: ' },
    Entity_DuplicateProperty: { code: 'Entity.DuplicateMember', msg: 'Duplicate Property:' },
    Entity_NameNotCapitalized: { code: 'Entity.NameNotCapitalized', msg: 'Entity name should start with a capital.' },
});

/**
 * Implementation of custom validations.
 */
export class RangerValidator {
    checkEntity_NameStartsWithCapital(entity: Entity, accept: ValidationAcceptor): void {
        if (entity.name) {
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

    checkEntity_NoDuplicateMembers(entity: Entity, accept: ValidationAcceptor): void {
        const issue = Issues.Entity_DuplicateProperty;
        const duplicates = this.findDuplicates(entity.properties);
        for (let dup of duplicates) {
            accept('error', `${issue.msg} [${dup.name}]`, { node: dup, property: 'name', code: issue.code });
        }
    }

    checkEntity_ShowDebugInfo(entity: Entity, accept: ValidationAcceptor): void {
        if (!Config.debug) return;
        for (let prop of entity.properties) {
            if (isLiteral(prop.value))
                accept('info', `${typeof prop.value.literal}(${prop.value.literal})`, {
                    node: prop,
                    property: 'value',
                    code: 'DebugInfo',
                });
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

    findDuplicates<T extends { name: string }>(elements: T[]): T[] {
        return elements
            .groupBy((el) => el.name)
            .valuesArray()
            .filter((arr) => arr.length >= 2)
            .flat();
    }
}
