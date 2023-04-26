import fs from 'fs';
import { streamAllContents, ValidationAcceptor, ValidationChecks } from 'langium';

import { buildDocument, hasErrors, isRangerFile, resolvePath } from '../utils/documents';
import { Issue, satisfies } from '../utils/types';
import * as ast from './generated/ast';
import { generator, isListFunc } from './ranger-generator';
import { RangerServices } from './ranger-module';
import { resolveReference } from './ranger-scope';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: RangerServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.RangerValidator;
    const checks: ValidationChecks<ast.RangerAstType> = {
        CsvFunc: [validator.checkCsvFunc_InvalidCsvFile],
        Document: [validator.checkDocument_NoDuplicateEntities, validator.checkDocument_NoDuplicateImports],
        Entity: [validator.checkEntity_NameStartsWithCapital],
        FilePath: [validator.checkFilePath_FileExists, validator.checkFilePath_NoBackslashes],
        Import: [
            validator.checkImport_CorrectFileExtension,
            validator.checkImport_NoValidationErrors,
            validator.checkImport_EntitiesExist,
        ],
        MapFunc: [validator.checkMapFunc_NoCircularReferences],
        MapToList: [validator.checkMapToList_IsBasedOnAListFunc],
        Objekt: [validator.checkObjekt_NoDuplicateProperties, validator.checkObjekt_NoReferenceToParentObjekt],
        PropertyReference: [validator.checkPropertyReference_NoCircularReferences],
    };
    registry.register(checks, validator);
}

export const Issues = satisfies<Record<string, Issue>>()({
    CircularReference: { code: 'CircularReference', msg: 'Circular reference' },
    DocumentHasErrors: { code: 'DocumentHasErrors', msg: 'File has errors' },
    DuplicateEntity: { code: 'DuplicateEntity', msg: 'Duplicate Entity' },
    DuplicateProperty: { code: 'DuplicateProperty', msg: 'Duplicate Property' },
    EntityDoesNotExist: { code: 'EntityDoesNotExist', msg: 'Entity does not exist' },
    FileDoesNotExist: { code: 'FileDoesNotExist', msg: 'File does not exist' },
    FilePathWithBackslashes: { code: 'FilePathWithBackslashes', msg: 'File paths should only contain forward slashes' },
    InvalidCsvFile: { code: 'InvalidCsvFile', msg: 'File does not contain valid CSV values (or delimiter is wrong)' },
    MapToList_NotBasedOnAListFunc: { code: 'MapToList.NotBasedOnAListFunc', msg: 'Unsupported value source' },
    NameNotCapitalized: { code: 'NameNotCapitalized', msg: 'Entity name should start with a capital' },
    WrongFileExtension: { code: 'WrongFileExtension', msg: 'File path should end with .ranger' },
});

/**
 * Implementation of custom validations.
 */
export class RangerValidator {
    constructor(protected services: RangerServices) {}

    checkCsvFunc_InvalidCsvFile(func: ast.CsvFunc, accept: ValidationAcceptor) {
        const issue = Issues.InvalidCsvFile;
        const filePath = resolvePath(func.filePath.value, func)!;
        if (!fs.existsSync(filePath)) return;
        try {
            generator.getValue(func);
        } catch (error) {
            accept('error', issue.msg, { node: func, property: 'filePath', code: issue.code });
        }
    }

    checkDocument_NoDuplicateEntities(document: ast.Document, accept: ValidationAcceptor) {
        const issue = Issues.DuplicateEntity;
        const entities = document.entities;
        const duplicates = this.findDuplicates(entities);
        for (let dup of duplicates) {
            accept('error', `${issue.msg}: '${dup.name}'`, { node: dup, property: 'name', code: issue.code });
        }
        // TODO: Add validation for duplicate (imported) Entities in global Scope
        // Error msg: XY shadows XY declared before
    }

    checkDocument_NoDuplicateImports(doc: ast.Document, accept: ValidationAcceptor) {
        // TODO
    }

    checkEntity_NameStartsWithCapital(entity: ast.Entity, accept: ValidationAcceptor): void {
        if (entity.name) {
            const issue = Issues.NameNotCapitalized;
            const firstChar = entity.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', issue.msg, { node: entity, property: 'name', code: issue.code });
            }
        }
    }

    checkFilePath_FileExists(filePath: ast.FilePath, accept: ValidationAcceptor) {
        const issue = Issues.FileDoesNotExist;
        const path = resolvePath(filePath.value, filePath);
        if (!fs.existsSync(path)) {
            accept('error', `${issue.msg}: '${path}'`, { node: filePath, property: 'value', code: issue.code });
        }
    }

    checkFilePath_NoBackslashes(filePath: ast.FilePath, accept: ValidationAcceptor) {
        const issue = Issues.FilePathWithBackslashes;
        if (filePath.$cstNode?.text.includes('\\')) {
            accept('warning', issue.msg, { node: filePath, property: 'value', code: issue.code });
        }
    }

    async checkImport_NoValidationErrors(imp: ast.Import, accept: ValidationAcceptor) {
        const relPath = imp.filePath.value;
        const absPath = resolvePath(relPath, imp);
        if (!isRangerFile(absPath)) {
            return;
        }

        const document = await buildDocument(this.services, absPath);
        if (hasErrors(document)) {
            accept('error', `${Issues.DocumentHasErrors.msg}: '${absPath}'`, {
                node: imp.filePath,
                property: 'value',
                code: Issues.DocumentHasErrors.code,
            });
        }
    }

    async checkImport_EntitiesExist(imp: ast.Import, accept: ValidationAcceptor) {
        const relPath = imp.filePath.value;
        const absPath = resolvePath(relPath, imp);

        let documentEntities = new Set<string>();
        if (isRangerFile(absPath)) {
            const document = await buildDocument(this.services, absPath);
            document.parseResult.value.entities.forEach((e) => documentEntities.add(e.name));
        }

        imp.entities.forEach((entity, index) => {
            if (!documentEntities.has(entity)) {
                accept('error', `${Issues.EntityDoesNotExist.msg} in file '${relPath}'`, {
                    node: imp,
                    property: 'entities',
                    index,
                    code: Issues.EntityDoesNotExist.code,
                });
            }
        });
    }

    checkImport_CorrectFileExtension(import_: ast.Import, accept: ValidationAcceptor) {
        const issue = Issues.WrongFileExtension;
        const filePath = import_.filePath.value;
        if (filePath && !filePath.endsWith('.ranger')) {
            accept('error', issue.msg, { node: import_.filePath, property: 'value', code: issue.code });
        }
    }

    checkMapFunc_NoCircularReferences(func: ast.MapFunc, accept: ValidationAcceptor): void {
        const issue = Issues.CircularReference;
        if (func === resolveReference(func.source)) {
            accept('error', issue.msg, { node: func, property: 'source', code: issue.code });
        }
    }

    checkMapToList_IsBasedOnAListFunc(mapFunc: ast.MapToList, accept: ValidationAcceptor): void {
        const issue = Issues.MapToList_NotBasedOnAListFunc;
        const sourceValue = resolveReference(mapFunc.source);
        if (!isListFunc(sourceValue)) {
            accept('error', issue.msg, {
                node: mapFunc,
                property: 'source',
                code: issue.code,
                data: {
                    suggestedChange: {
                        range: mapFunc.list.$cstNode?.range,
                        newText:
                            '{' +
                            mapFunc.list.values.map((val, i) => `"val${i}": ${val.$cstNode?.text}`).join(', ') +
                            '}',
                    },
                },
            });
        }
    }

    checkObjekt_NoDuplicateProperties(objekt: ast.Objekt, accept: ValidationAcceptor): void {
        const issue = Issues.DuplicateProperty;
        const duplicates = this.findDuplicates(objekt.properties);
        for (let dup of duplicates) {
            accept('error', `${issue.msg}: '${dup.name}'`, { node: dup, property: 'name', code: issue.code });
        }
    }

    checkObjekt_NoReferenceToParentObjekt(obj: ast.Objekt, accept: ValidationAcceptor) {
        const issue = Issues.CircularReference;
        for (const ref of streamAllContents(obj)
            .filter(ast.isPropertyReference)
            .filter((ref) => ref.$containerProperty !== 'previous')) {
            if (resolveReference(ref) === obj) {
                accept('error', issue.msg, { node: ref, code: issue.code });
            }
        }
    }

    checkPropertyReference_NoCircularReferences(ref: ast.PropertyReference, accept: ValidationAcceptor): void {
        const issue = Issues.CircularReference;
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
