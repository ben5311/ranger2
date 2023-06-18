import { describe, test } from 'vitest';

import { Issues } from '../../../src/language-server/ranger-validator';
import {
    createTempFile,
    expectError,
    expectNoIssues,
    expectWarning,
    firstEntity,
    firstProperty,
    parseDocument,
} from '../../../src/utils/test';

describe('Entity', () => {
    describe('Validate', () => {
        test('NameStartsWithCapital ✔', async () => {
            const document = await parseDocument(`
            Entity Customer {}`);

            expectNoIssues(document);
        });

        test('NameStartsWithCapital ✖', async () => {
            const document = await parseDocument(`
            Entity customer {}`);

            expectWarning(document, Issues.NameNotCapitalized.code, {
                node: firstEntity(document),
                property: 'name',
            });
        });

        test('NoDuplicateEntities ✔', async () => {
            const document = await parseDocument(`
            Entity Customer {}`);

            expectNoIssues(document);
        });

        test('NoDuplicateEntities ✖', async () => {
            const document = await parseDocument(`
            Entity Customer {}
            Entity Customer {}`);

            expectError(document, Issues.DuplicateEntity.code, {
                node: firstEntity(document),
                property: 'name',
            });
        });

        test('NoDuplicateEntities ✖✖', async () => {
            const customerFile = createTempFile({ postfix: '.ranger', data: `Entity Customer {}` });

            const document = await parseDocument(`
            from "${customerFile.name}" import Customer
            Entity Customer {}`);

            expectError(document, Issues.DuplicateEntity.code, {
                node: firstEntity(document),
                property: 'name',
            });
        });

        test('NoDuplicateProperties ✔', async () => {
            const document = await parseDocument(`
            Entity Customer {
                name: "John Doe"
            }`);

            expectNoIssues(document);
        });

        test('NoDuplicateProperties ✖', async () => {
            const document = await parseDocument(`
            Entity Customer {
                name: "John Doe"
                name: "John Doe"
            }`);

            expectError(document, Issues.DuplicateProperty.code, {
                node: firstProperty(document),
                property: 'name',
            });
        });
    });
});
