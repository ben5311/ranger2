import { describe, expect, test } from 'vitest';

import { Issues } from '../../../src/language-server/ranger-validator';
import {
    createObjectGenerator,
    createTempFile,
    expectError,
    expectNoIssues,
    expectWarning,
    parseDocument,
} from '../../../src/utils/test';

describe('Imports', () => {
    describe('Generate', () => {
        test('Single import', async () => {
            const accountFile = createTempFile({
                postfix: '.ranger',
                data: `Entity Account { currency: "EUR"}`,
            });

            const generator = await createObjectGenerator(`
            from "${accountFile.name}" import Account
            Entity User {
                name: "John"
                account: Account
            }`);

            const output = generator.next();

            expect(output).toStrictEqual({
                name: 'John',
                account: { currency: 'EUR' },
            });
        });

        test('Multiple imports #1', async () => {
            const accountFile = createTempFile({
                postfix: '.ranger',
                data: `
            Entity Account { currency: "EUR" }
            Entity Person { name: "John" }
            `,
            });

            const generator = await createObjectGenerator(`
            from "${accountFile.name}" import Account, Person
            Entity User {
                name: Person.name
                account: Account
            }`);

            let output = generator.next();

            expect(output).toStrictEqual({
                name: 'John',
                account: { currency: 'EUR' },
            });
        });

        test('Multiple imports #2', async () => {
            const accountFile = createTempFile({
                postfix: '.ranger',
                data: `
            Entity Account { currency: "EUR" }
            Entity Person { name: "John" }
            `,
            });

            const generator = await createObjectGenerator(`
            from "${accountFile.name}" import Account
            from "${accountFile.name}" import Person
            Entity User {
                name: Person.name
                account: Account
            }`);

            const output = generator.next();

            expect(output).toStrictEqual({
                name: 'John',
                account: { currency: 'EUR' },
            });
        });
    });

    describe('Validate', () => {
        test('CorrectFileExtension ✖', async () => {
            const document = await parseDocument({
                text: `from "Test.txt" import Test`,
                includeImports: false,
            });

            expectError(document, Issues.WrongFileExtension.code, {
                node: document.doc.imports[0].filePath,
                property: 'value',
            });
        });

        test('EntityDoesExist ✔', async () => {
            const rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test1 {}` });

            const document = await parseDocument(`
            from "${rangerFile.name}" import Test1`);

            expectNoIssues(document);
        });

        test('EntityDoesExist ✖', async () => {
            const rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test1 {}` });

            const document = await parseDocument(`from "${rangerFile.name}" import Test1, Test2`);

            expectError(document, Issues.ReferenceError.code, {
                node: document.doc.imports[0],
                property: { name: 'entities', index: 1 },
            });
        });

        test('NoDuplicateImports ✔', async () => {
            const rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test {}` });

            const document = await parseDocument(`
            from "${rangerFile.name}" import Test`);

            expectNoIssues(document);
        });

        test('NoDuplicateImports ✖', async () => {
            const rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test {}` });

            let document = await parseDocument(`
            from "${rangerFile.name}" import Test, Test`);

            expectWarning(document, Issues.DuplicateImport.code, {
                node: document.doc.imports[0],
                property: { name: 'entities', index: 1 },
            });

            document = await parseDocument(`
            from "${rangerFile.name}" import Test
            from "${rangerFile.name}" import Test`);

            expectWarning(document, Issues.DuplicateImport.code, {
                node: document.doc.imports[1],
                property: { name: 'entities', index: 0 },
            });
        });

        test('NoValidationErrors ✔', async () => {
            const rangerFile = createTempFile({ postfix: '.ranger', data: `Entity Test {}` });

            const document = await parseDocument(`
            from "${rangerFile.name}" import Test`);

            expectNoIssues(document);
        });

        test('NoValidationErrors ✖', async () => {
            const rangerFile = createTempFile({ postfix: '.ranger', data: `Enti` });

            const document = await parseDocument(`
            from "${rangerFile.name}" import Test`);

            expectError(document, Issues.DocumentHasErrors.code, {
                node: document.doc.imports[0].filePath,
                property: 'value',
            });
        });
    });
});
