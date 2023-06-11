import { ValidationCheck } from 'langium';

import { satisfies } from '../utils/types';
import { RangerServices } from './ranger-module';

export const Issues = satisfies<Record<string, { code: string; msg: string }>>()({
    CircularReference: { code: 'CircularReference', msg: 'Circular reference' },
    DocumentHasErrors: { code: 'DocumentHasErrors', msg: 'File has errors' },
    DuplicateEntity: { code: 'DuplicateEntity', msg: 'Duplicate Entity' },
    DuplicateImport: { code: 'DuplicateImport', msg: 'Duplicate Import' },
    DuplicateProperty: { code: 'DuplicateProperty', msg: 'Duplicate Property' },
    EntityDoesNotExist: { code: 'EntityDoesNotExist', msg: 'Entity does not exist' },
    FileDoesNotExist: { code: 'FileDoesNotExist', msg: 'File does not exist' },
    FilePathWithBackslashes: { code: 'FilePathWithBackslashes', msg: 'File paths should only contain forward slashes' },
    InvalidCsvFile: { code: 'InvalidCsvFile', msg: 'Invalid CSV file, check delimiter.' },
    MapToList_NotBasedOnAListFunc: { code: 'MapToList.NotBasedOnAListFunc', msg: 'Unsupported value source' },
    NameNotCapitalized: { code: 'NameNotCapitalized', msg: 'Entity name should start with a capital' },
    ReferenceError: { code: 'linking-error', msg: 'Could not resolve reference' },
    TemplateSyntaxError: { code: 'TemplateSyntaxError', msg: 'Template syntax error' },
    WrongFileExtension: { code: 'WrongFileExtension', msg: 'File path should end with .ranger' },
});

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: RangerServices) {
    const registry = services.validation.ValidationRegistry;
    const companions = services.generator.Companions.companions;
    const checks: Record<string, ValidationCheck[]> = {};
    for (let [type, companion] of companions) {
        checks[type] = companion.checks.map((check) => check.bind(companion));
    }
    registry.register(checks);
}
