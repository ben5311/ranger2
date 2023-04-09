import { beforeEach, describe, test } from 'vitest';

import { Objekt } from '../../src/language-server/generated/ast';
import { Config, resetConfig } from '../../src/language-server/ranger-config';
import { Issues } from '../../src/language-server/ranger-validator';
import { clearIndex, expectError, expectInfo, expectNoIssues, expectWarning, validate } from '../../src/utils/test';

beforeEach(() => {
    clearIndex();
    resetConfig();
});

describe('RangerValidator', () => {
    describe('checkDocument', () => {
        test('EntityNameStartsWithCapital', async () => {
            let validation = await validate(`
            Entity Customer {}`);
            expectNoIssues(validation);

            validation = await validate(`
            Entity customer {}`);
            expectWarning(validation, Issues.Entity_NameNotCapitalized.code, {
                node: validation.result.entities[0],
                property: 'name',
            });
        });

        test('NoDuplicateEntities', async () => {
            let validation = await validate(`
            Entity Customer {}`);
            expectNoIssues(validation);

            validation = await validate(`
            Entity Customer {}
            Entity Customer {}`);
            expectError(validation, Issues.Document_DuplicateEntity.code, {
                node: validation.result.entities[0],
                property: 'name',
            });
        });
    });

    describe('checkObjekt', () => {
        test('NoDuplicateProperties', async () => {
            let validation = await validate(`
            Entity Customer {
                name: "John Doe"
            }`);
            expectNoIssues(validation);

            validation = await validate(`
            Entity Customer {
                name: "John Doe"
                name: "John Doe"
            }`);
            expectError(validation, Issues.Objekt_DuplicateProperty.code, {
                node: (validation.result.entities[0].value as Objekt).properties[0],
                property: 'name',
            });
        });

        test('ShowDebugInfo', async () => {
            Config.debug = true;
            let validation = await validate(`
            Entity Customer {
                name: "John Doe"
                age: 28
                married: false
                phone: null
            }`);
            let props = (validation.result.entities[0].value as Objekt).properties;
            expectInfo(validation, Issues.DebugInfo.code, { node: props[0], property: 'value', message: '"John Doe"' });
            expectInfo(validation, Issues.DebugInfo.code, { node: props[1], property: 'value', message: '28' });
            expectInfo(validation, Issues.DebugInfo.code, { node: props[2], property: 'value', message: 'false' });
            expectInfo(validation, Issues.DebugInfo.code, { node: props[3], property: 'value', message: 'null' });
        });
    });

    describe('checkPropertyReference', () => {
        test('NoCircularReferences', async () => {
            let validation = await validate(`
            Entity Customer {
                name: name
            }`);
            expectError(validation, Issues.PropertyReference_CircularReference.code, {
                node: (validation.result.entities[0].value as Objekt).properties[0],
                property: 'value',
            });

            validation = await validate(`
            Entity Customer {
                first: second
                second: first
            }`);
            expectError(validation, Issues.PropertyReference_CircularReference.code, {
                node: (validation.result.entities[0].value as Objekt).properties[0],
                property: 'value',
            });
            expectError(validation, Issues.PropertyReference_CircularReference.code, {
                node: (validation.result.entities[0].value as Objekt).properties[1],
                property: 'value',
            });
        });
    });
});
