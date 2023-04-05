import { ValidationAcceptor, ValidationChecks } from 'langium';

import { getValue } from '../generator/ranger-generator';
import { Issue, satisfies } from '../utils/types';
import { Document, Objekt, PrintStatement, RangerAstType } from './generated/ast';
import { Config } from './ranger-config';
import { RangerServices } from './ranger-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: RangerServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.RangerValidator;
    const checks: ValidationChecks<RangerAstType> = {
        Document: [validator.checkDocument_NoDuplicateEntities, validator.checkDocument_EntityNamesStartsWithCapital],
        Objekt: [validator.checkObjekt_NoDuplicateProperties, validator.checkObjekt_ShowDebugInfo],
        PrintStatement: validator.checkPrintStatement_ShowDebugInfo,
    };
    registry.register(checks, validator);
}

export const Issues = satisfies<Record<string, Issue>>()({
    Document_DuplicateEntity: { code: 'Document.DuplicateEntity', msg: 'Duplicate Entity: ' },
    Entity_NameNotCapitalized: { code: 'Entity.NameNotCapitalized', msg: 'Entity name should start with a capital.' },
    Object_DuplicateProperty: { code: 'Entity.DuplicateMember', msg: 'Duplicate Property:' },
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
        const issue = Issues.Object_DuplicateProperty;
        const duplicates = this.findDuplicates(objekt.properties);
        for (let dup of duplicates) {
            accept('error', `${issue.msg} [${dup.name}]`, { node: dup, property: 'name', code: issue.code });
        }
    }

    checkObjekt_ShowDebugInfo(objekt: Objekt, accept: ValidationAcceptor): void {
        if (!Config.debug) return;
        for (let prop of objekt.properties || {}) {
            let value = getValue(prop.value!);
            accept('info', `${typeof value}(${value})`, { node: prop, property: 'value', code: Issues.DebugInfo.code });
        }
    }

    checkPrintStatement_ShowDebugInfo(print: PrintStatement, accept: ValidationAcceptor) {
        let element = print.propertyReference.element.ref;
        let value = getValue(element);
        accept('info', JSON.stringify(value), { node: print, code: Issues.DebugInfo.code });
    }

    findDuplicates<T extends { name: string }>(elements: T[]): T[] {
        return elements
            .groupBy((el) => el.name)
            .valuesArray()
            .filter((arr) => arr.length >= 2)
            .flat();
    }
}
