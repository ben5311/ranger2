import { beforeEach, describe, test } from 'vitest';

import { CsvFunc, Objekt } from '../../src/language-server/generated/ast';
import { Issues } from '../../src/language-server/ranger-validator';
import { clearIndex, createTempFile, expectError, expectNoIssues, expectWarning, parse } from '../../src/utils/test';

beforeEach(() => {
    clearIndex();
});

describe('RangerValidator', () => {
    describe('checkCsvFunc', () => {
        test('NoParseErrors', async () => {
            let csvFile = createTempFile({ postfix: '.csv', data: 'first,second,third\r\n1,2,3' });
            let document = await parse(`
            Entity Customer {
                data: csv("${csvFile.name}")
            }`);
            expectNoIssues(document);

            csvFile = createTempFile({ postfix: '.csv', data: '{"this": "is", "json": "content"}' });
            document = await parse(`
            Entity Customer {
                data: csv("${csvFile.name}")
            }`);
            expectError(document, Issues.InvalidCsvFile.code, {
                node: (document.doc.entities[0].value as Objekt).properties[0].value as CsvFunc,
                property: 'filePath',
            });
        });
    });

    describe('checkDocument', () => {
        test('NoDuplicateEntities', async () => {
            let document = await parse(`
            Entity Customer {}`);
            expectNoIssues(document);

            document = await parse(`
            Entity Customer {}
            Entity Customer {}`);
            expectError(document, Issues.DuplicateEntity.code, {
                node: document.doc.entities[0],
                property: 'name',
            });

            let customerFile = createTempFile({ postfix: '.ranger', data: `Entity Customer {}` });
            document = await parse(`
            from "${customerFile.name}" import Customer
            Entity Customer {}`);
            expectError(document, Issues.DuplicateEntity.code, {
                node: document.doc.entities[0],
                property: 'name',
            });
        });

        test('NoDuplicateImports', async () => {
            let rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test {}` });
            let document = await parse(`
            from "${rangerFile.name}" import Test`);
            expectNoIssues(document);

            document = await parse(`
            from "${rangerFile.name}" import Test, Test`);
            expectWarning(document, Issues.DuplicateImport.code, {
                node: document.doc.imports[0],
                property: { name: 'entities', index: 1 },
            });

            document = await parse(`
            from "${rangerFile.name}" import Test
            from "${rangerFile.name}" import Test`);
            expectWarning(document, Issues.DuplicateImport.code, {
                node: document.doc.imports[1],
                property: { name: 'entities', index: 0 },
            });
        });
    });

    describe('checkEntity', () => {
        test('NameStartsWithCapital', async () => {
            let document = await parse(`
            Entity Customer {}`);
            expectNoIssues(document);

            document = await parse(`
            Entity customer {}`);
            expectWarning(document, Issues.NameNotCapitalized.code, {
                node: document.doc.entities[0],
                property: 'name',
            });
        });
    });

    describe('checkFilePath', () => {
        test('FileExists', async () => {
            let document = await parse(`
            Entity Customer {
                data: csv("customer.csv")
            }`);
            expectError(document, Issues.FileDoesNotExist.code, {
                node: (document.doc.entities[0].value as Objekt).properties[0].value as CsvFunc,
                property: 'filePath',
            });

            const csvFile = createTempFile({ postfix: '.csv' });
            document = await parse(`
            Entity Customer {
                data: csv("${csvFile.name}")
            }`);
            expectNoIssues(document);
        });

        test('NoBackslashes', async () => {
            let document = await parse(`
            Entity Customer {
                data: csv(".\\folder\\customer.csv")
            }`);
            expectWarning(document, Issues.FilePathWithBackslashes.code, {
                node: (document.doc.entities[0].value as Objekt).properties[0].value as CsvFunc,
                property: 'filePath',
            });
        });
    });

    describe('checkImport', () => {
        test('WrongFileExtension', async () => {
            let document = await parse(`from "Test.txt" import Test`, { includeImports: false });
            expectError(document, Issues.WrongFileExtension.code, {
                node: document.doc.imports[0].filePath,
                property: 'value',
            });
        });

        test('DocumentHasErrors', async () => {
            let rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test {}` });
            let document = await parse(`from "${rangerFile.name}" import Test`);
            expectNoIssues(document);

            rangerFile = createTempFile({ postfix: '.ranger', data: `Enti` });
            document = await parse(`from "${rangerFile.name}" import Test`);
            expectError(document, Issues.DocumentHasErrors.code, {
                node: document.doc.imports[0].filePath,
                property: 'value',
            });
        });

        test('EntityDoesNotExist', async () => {
            const rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test1 {}` });
            let document = await parse(`from "${rangerFile.name}" import Test1`);
            expectNoIssues(document);

            document = await parse(`from "${rangerFile.name}" import Test1, Test2`);
            expectError(document, Issues.ReferenceError.code, {
                node: document.doc.imports[0],
                property: { name: 'entities', index: 1 },
            });
        });
    });

    describe('checkMapFunc', () => {
        test('NoCircularReferences', async () => {
            let document = await parse(`
            Entity Customer {
                name: map(name => [1, 2, 3])
            }`);
            const name = (document.doc.entities[0].value as Objekt).properties[0];
            expectError(document, Issues.CircularReference.code, {
                node: name.value,
                property: 'source',
            });
        });
    });

    describe('checkMapToList', () => {
        test('IsBasedOnAList', async () => {
            let document = await parse(`
            Entity Customer {
                gender: random("male", "female")
                name: map(gender => ["Max", "Anna"])
            }`);
            expectNoIssues(document);

            document = await parse(`
            Entity Customer {
                gender: "male"
                name: map(gender => ["Max", "Anna"])
            }`);
            expectError(document, Issues.MapToList_NotBasedOnAListFunc.code, {
                node: (document.doc.entities[0].value as Objekt).properties[1].value,
                property: 'source',
            });
        });
    });

    describe('checkObjekt', () => {
        test('NoDuplicateProperties', async () => {
            let document = await parse(`
            Entity Customer {
                name: "John Doe"
            }`);
            expectNoIssues(document);

            document = await parse(`
            Entity Customer {
                name: "John Doe"
                name: "John Doe"
            }`);
            expectError(document, Issues.DuplicateProperty.code, {
                node: (document.doc.entities[0].value as Objekt).properties[0],
                property: 'name',
            });
        });
    });

    describe('checkPropertyReference', () => {
        test('NoCircularReferences', async () => {
            let document = await parse(`
            Entity Customer {
                name: name
            }`);
            let [name] = (document.doc.entities[0].value as Objekt).properties;
            expectError(document, Issues.CircularReference.code, { node: name, property: 'value' });

            document = await parse(`
            Entity Customer {
                first: second
                second: first
            }`);
            let [first, second] = (document.doc.entities[0].value as Objekt).properties;
            expectError(document, Issues.CircularReference.code, { node: first, property: 'value' });
            expectError(document, Issues.CircularReference.code, { node: second, property: 'value' });

            document = await parse(`
            Entity Account {
                balance: 1000
                account: {
                    ref1: Account
                    ref2: Account.account
                }
            }`);
            let account = (document.doc.entities[0].value as Objekt).properties[1].value as Objekt;
            let [ref1, ref2] = account.properties;
            expectError(document, Issues.CircularReference.code, { node: ref1, property: 'value' });
            expectError(document, Issues.CircularReference.code, { node: ref2, property: 'value' });

            document = await parse(`
            Entity Customer {
                account: Account
            }
            Entity Account {
                account: Customer.account
            }
            `);
            let [account_] = (document.doc.entities[1].value as Objekt).properties;
            expectError(document, Issues.CircularReference.code, { node: account_, property: 'value' });
        });
    });
});
