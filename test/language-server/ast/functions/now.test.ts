import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { generator as rangerGenerator } from '../../../../src/language-server/ranger-generator';
import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('now()', () => {
    const document = `
    Entity Test {
        timestamp: now()
    }`;
    const today = new Date().toISOString().substring(0, 10);

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.timestamp.substring(0, 10)).toBe(today);
            expect(output.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [timestamp] = properties(doc);
        const nowTimestamp = rangerGenerator.getValue(timestamp);

        expect(hover(timestamp)).toBe(`timestamp: "${nowTimestamp}"`);

        expect(hover(timestamp.value)?.trim()).toBe(dedent`
        now()
        \n---\n
        Retrieves the current timestamp.

        It is determined once and remains constant throughout.

        Example: "${nowTimestamp}"`);
    });
});
