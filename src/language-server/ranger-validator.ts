import { ValidationAcceptor, ValidationChecks } from 'langium';

import { Issue, satisfies } from '../utils/types';
import { Entity, RangerAstType } from './generated/ast';

import type { RangerServices } from './ranger-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: RangerServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.RangerValidator;
    const checks: ValidationChecks<RangerAstType> = {
        Entity: validator.checkEntity_NameStartsWithCapital,
    };
    registry.register(checks, validator);
}

export const Issues = satisfies<Record<string, Issue>>()({
    Document_DuplicateEntity: { code: 'Document.DuplicateEntity', msg: 'Duplicate Entity: ' },
    Entity_DuplicateMember: { code: 'Entity.DuplicateMember', msg: 'Duplicate Member:' },
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

    // checkEntity_NoDuplicateMembers(entity: Entity, accept: ValidationAcceptor): void {
    //     const issue = Issues.Entity_DuplicateMember;
    //     const duplicates = this.findDuplicates(entity.members);
    //     for (let dup of duplicates) {
    //         accept('error', `${issue.msg} [${dup.name}]`, { node: dup, property: 'name', code: issue.code });
    //     }
    // }

    // checkDocument_NoDuplicateEntities(document: Document, accept: ValidationAcceptor) {
    //     const issue = Issues.Document_DuplicateEntity;
    //     const entities = this.indexAccess.searchIndex(Entity);
    //     const duplicates = this.findDuplicates(entities).filter((desc) => desc.documentUri === document.$document?.uri);
    //     for (let dup of duplicates) {
    //         accept('error', `${issue.msg} [${dup.name}]`, { node: dup.node!, property: 'name', code: issue.code });
    //     }
    // }

    findDuplicates<T extends { name: string }>(elements: T[]): T[] {
        return elements
            .groupBy((el) => el.name)
            .valuesArray()
            .filter((arr) => arr.length >= 2)
            .flat();
    }
}
