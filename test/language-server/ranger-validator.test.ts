import { beforeEach, describe, test } from 'vitest';

import { CsvFunc, Objekt } from '../../src/language-server/generated/ast';
import { Issues } from '../../src/language-server/ranger-validator';
import { clearIndex, createTempFile, expectError, expectNoIssues, expectWarning, validate } from '../../src/utils/test';

beforeEach(() => {
    clearIndex();
});

describe('RangerValidator', () => {
    describe('checkCsvFunc', () => {
        test('FileExists', async () => {
            let validation = await validate(`
            Entity Customer {
                data: csv("customer.csv")
            }`);
            expectError(validation, Issues.FileDoesNotExist.code, {
                node: (validation.result.entities[0].value as Objekt).properties[0].value as CsvFunc,
                property: 'filePath',
            });

            const csvFile = createTempFile({ postfix: '.csv' });
            validation = await validate(`
            Entity Customer {
                data: csv("${escape(csvFile.name)}")
            }`);
            expectNoIssues(validation);
        });

        test('NoBackslashes', async () => {
            let validation = await validate(`
            Entity Customer {
                data: csv(".\\folder\\customer.csv")
            }`);
            expectWarning(validation, Issues.FilePathWithBackslashes.code, {
                node: (validation.result.entities[0].value as Objekt).properties[0].value as CsvFunc,
                property: 'filePath',
            });
        });

        test('NoParseErrors', async () => {
            let csvFile = createTempFile({ postfix: '.csv', data: 'first,second,third\r\n1,2,3' });
            let validation = await validate(`
            Entity Customer {
                data: csv("${escape(csvFile.name)}")
            }`);
            expectNoIssues(validation);

            csvFile = createTempFile({ postfix: '.csv', data: '{"this": "is", "json": "content"}' });
            validation = await validate(`
            Entity Customer {
                data: csv("${escape(csvFile.name)}")
            }`);
            expectError(validation, Issues.InvalidCsvFile.code, {
                node: (validation.result.entities[0].value as Objekt).properties[0].value as CsvFunc,
                property: 'filePath',
            });
        });
    });

    describe('checkDocument', () => {
        test('EntityNameStartsWithCapital', async () => {
            let validation = await validate(`
            Entity Customer {}`);
            expectNoIssues(validation);

            validation = await validate(`
            Entity customer {}`);
            expectWarning(validation, Issues.NameNotCapitalized.code, {
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
            expectError(validation, Issues.DuplicateEntity.code, {
                node: validation.result.entities[0],
                property: 'name',
            });
        });
    });

    describe('checkMapFunc', () => {
        test('NoCircularReferences', async () => {
            let validation = await validate(`
            Entity Customer {
                name: map(name => [1, 2, 3])
            }`);
            const name = (validation.result.entities[0].value as Objekt).properties[0];
            expectError(validation, Issues.CircularReference.code, {
                node: name.value,
                property: 'source',
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
            expectError(validation, Issues.MapToList_NotBasedOnAListFunc.code, {
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
            expectError(validation, Issues.DuplicateProperty.code, {
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
            expectError(validation, Issues.CircularReference.code, {
                node: (validation.result.entities[0].value as Objekt).properties[0],
                property: 'value',
            });

            validation = await validate(`
            Entity Customer {
                first: second
                second: first
            }`);
            expectError(validation, Issues.CircularReference.code, {
                node: (validation.result.entities[0].value as Objekt).properties[0],
                property: 'value',
            });
            expectError(validation, Issues.CircularReference.code, {
                node: (validation.result.entities[0].value as Objekt).properties[1],
                property: 'value',
            });

            validation = await validate(`
            Entity Account {
                balance: 1000
                account: {
                    ref1: Account
                    ref2: Account.account
                }
            }`);
            const account = (validation.result.entities[0].value as Objekt).properties[1].value as Objekt;
            expectError(validation, Issues.CircularReference.code, {
                node: account.properties[0],
                property: 'value',
            });
            expectError(validation, Issues.CircularReference.code, {
                node: account.properties[1],
                property: 'value',
            });

            validation = await validate(`
            Entity Customer {
                account: Account
            }
            Entity Account {
                account: Customer.account
            }
            `);
            expectError(validation, Issues.CircularReference.code, {
                node: (validation.result.entities[1].value as Objekt).properties[0],
                property: 'value',
            });
        });
    });
});

/**
 * Escape Backslashes in file path.
 */
function escape(filePath: string) {
    return filePath.replace(/\\/g, '/');
}
