import { beforeEach, describe, test } from 'vitest';

import { CsvFunc, Objekt } from '../../src/language-server/generated/ast';
import { Issues } from '../../src/language-server/ranger-validator';
import { clearIndex, createTempFile, expectError, expectNoIssues, expectWarning, validate } from '../../src/utils/test';

beforeEach(() => {
    clearIndex();
});

describe('RangerValidator', () => {
    describe('checkCsvFunc', () => {
        test('NoParseErrors', async () => {
            let csvFile = createTempFile({ postfix: '.csv', data: 'first,second,third\r\n1,2,3' });
            let validation = await validate(`
            Entity Customer {
                data: csv("${csvFile.name}")
            }`);
            expectNoIssues(validation);

            csvFile = createTempFile({ postfix: '.csv', data: '{"this": "is", "json": "content"}' });
            validation = await validate(`
            Entity Customer {
                data: csv("${csvFile.name}")
            }`);
            expectError(validation, Issues.InvalidCsvFile.code, {
                node: (validation.result.entities[0].value as Objekt).properties[0].value as CsvFunc,
                property: 'filePath',
            });
        });
    });

    describe('checkDocument', () => {
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

        test('NoDuplicateImports', async () => {
            let rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test {}` });
            let validation = await validate(`
            from "${rangerFile.name}" import Test`);
            expectNoIssues(validation);

            validation = await validate(`
            from "${rangerFile.name}" import Test, Test`);
            expectWarning(validation, Issues.DuplicateImport.code, {
                node: validation.result.imports[0],
                property: { name: 'entities', index: 1 },
            });

            validation = await validate(`
            from "${rangerFile.name}" import Test
            from "${rangerFile.name}" import Test`);
            expectWarning(validation, Issues.DuplicateImport.code, {
                node: validation.result.imports[1],
                property: { name: 'entities', index: 0 },
            });
        });
    });

    describe('checkEntity', () => {
        test('NameStartsWithCapital', async () => {
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
    });

    describe('checkFilePath', () => {
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
                data: csv("${csvFile.name}")
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
    });

    describe('checkImport', () => {
        test('WrongFileExtension', async () => {
            let validation = await validate(`from "Test.txt" import Test`);
            expectError(validation, Issues.WrongFileExtension.code, {
                node: validation.result.imports[0].filePath,
                property: 'value',
            });
        });

        test('DocumentHasErrors', async () => {
            let rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test {}` });
            let validation = await validate(`from "${rangerFile.name}" import Test`);
            expectNoIssues(validation);

            rangerFile = createTempFile({ postfix: '.ranger', data: `Enti` });
            validation = await validate(`from "${rangerFile.name}" import Test`);
            expectError(validation, Issues.DocumentHasErrors.code, {
                node: validation.result.imports[0].filePath,
                property: 'value',
            });
        });

        test('EntityDoesNotExist', async () => {
            const rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test1 {}` });
            let validation = await validate(`from "${rangerFile.name}" import Test1`);
            expectNoIssues(validation);

            validation = await validate(`from "${rangerFile.name}" import Test1, Test2`);
            expectError(validation, Issues.EntityDoesNotExist.code, {
                node: validation.result.imports[0],
                property: { name: 'entities', index: 1 },
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
            let [name] = (validation.result.entities[0].value as Objekt).properties;
            expectError(validation, Issues.CircularReference.code, { node: name, property: 'value' });

            validation = await validate(`
            Entity Customer {
                first: second
                second: first
            }`);
            let [first, second] = (validation.result.entities[0].value as Objekt).properties;
            expectError(validation, Issues.CircularReference.code, { node: first, property: 'value' });
            expectError(validation, Issues.CircularReference.code, { node: second, property: 'value' });

            validation = await validate(`
            Entity Account {
                balance: 1000
                account: {
                    ref1: Account
                    ref2: Account.account
                }
            }`);
            let account = (validation.result.entities[0].value as Objekt).properties[1].value as Objekt;
            let [ref1, ref2] = account.properties;
            expectError(validation, Issues.CircularReference.code, { node: ref1, property: 'value' });
            expectError(validation, Issues.CircularReference.code, { node: ref2, property: 'value' });

            validation = await validate(`
            Entity Customer {
                account: Account
            }
            Entity Account {
                account: Customer.account
            }
            `);
            let [account_] = (validation.result.entities[1].value as Objekt).properties;
            expectError(validation, Issues.CircularReference.code, { node: account_, property: 'value' });
        });
    });
});
