import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { CsvFunc } from '../../../../src/language-server/generated/ast';
import { Issues } from '../../../../src/language-server/ranger-validator';
import {
    createObjectGenerator,
    createTempFile,
    expectError,
    expectNoIssues,
    expectWarning,
    firstValue,
    hover,
    parseDocument,
    properties,
} from '../../../../src/utils/test';

describe('csv()', () => {
    const csvFile = createTempFile({ postfix: '.csv', data: 'first,second,third\r\n1,2,3' });

    const document = `
    Entity Test {
        data: csv("${csvFile.name}", delimiter=",")
        first: data.first
    }`;

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output).toStrictEqual({
                data: {
                    first: '1',
                    second: '2',
                    third: '3',
                },
                first: '1',
            });
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [data, first] = properties(doc);

        expect(hover(data)).toBe(dedent`
        data: {
          "first": "1",
          "second": "2",
          "third": "3"
        }`);

        expect(hover(first)).toBe('first: "1"');
        expect(hover(first.value)).toBe('first: "1"');

        let signature = hover(data.value)?.replace(new RegExp(csvFile.name, 'g'), 'data.csv');

        expect(signature).toBe(dedent`
        csv("data.csv", delimiter=",")
        \n---\n
        Generates a random row of CSV file \`data.csv\`.

        Example: {
          "first": "1",
          "second": "2",
          "third": "3"
        }`);
    });

    describe('Validate', () => {
        test('FileExists ✔', async () => {
            const csvFile = createTempFile({ postfix: '.csv' });

            const document = await parseDocument(`
            Entity Customer {
                data: csv("${csvFile.name}")
            }`);

            expectNoIssues(document);
        });

        test('FileExists ✖', async () => {
            const document = await parseDocument(`
            Entity Customer {
                data: csv("customer.csv")
            }`);

            expectError(document, Issues.FileDoesNotExist.code, {
                node: firstValue(document) as CsvFunc,
                property: 'filePath',
            });
        });

        test('NoBackslashes ✖', async () => {
            const document = await parseDocument(`
            Entity Customer {
                data: csv(".\\folder\\customer.csv")
            }`);

            expectWarning(document, Issues.FilePathWithBackslashes.code, {
                node: firstValue(document) as CsvFunc,
                property: 'filePath',
            });
        });

        test('NoParseErrors ✔', async () => {
            const csvFile = createTempFile({ postfix: '.csv', data: 'first,second,third\r\n1,2,3' });

            const document = await parseDocument(`
            Entity Customer {
                data: csv("${csvFile.name}")
            }`);

            expectNoIssues(document);
        });

        test('NoParseErrors ✖', async () => {
            const csvFile = createTempFile({ postfix: '.csv', data: '{"this": "is", "json": "content"}' });

            const document = await parseDocument(`
            Entity Customer {
                data: csv("${csvFile.name}")
            }`);

            expectError(document, Issues.InvalidCsvFile.code, {
                node: firstValue(document) as CsvFunc,
                property: 'filePath',
            });
        });
    });
});
