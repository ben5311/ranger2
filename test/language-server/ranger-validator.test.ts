import { beforeEach, describe, test } from 'vitest';

import { Objekt } from '../../src/language-server/generated/ast';
import { Issues } from '../../src/language-server/ranger-validator';
import { clearIndex, expectError, expectNoIssues, expectWarning, validate } from '../../src/utils/test';

beforeEach(() => {
    clearIndex();
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

    describe('checkMapToList', () => {
        test('IsBasedOnAList', async () => {
            let validation = await validate(`
            Entity Customer {
                gender: random("male", "female")
                name: map(gender => ["Max", "Anna"])
            }`);
            expectNoIssues(validation);

            validation = await validate(`
            Entity Customer {
                gender: "male"
                name: map(gender => ["Max", "Anna"])
            }`);
            expectError(validation, Issues.MapToList_NotBasedOnAList.code, {
                node: (validation.result.entities[0].value as Objekt).properties[1].value,
                property: 'source',
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
