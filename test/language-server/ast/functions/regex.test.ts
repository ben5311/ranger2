import dedent from 'dedent-js';
import { range } from 'lodash';
import { describe, expect, test } from 'vitest';

import { generator as rangerGenerator } from '../../../../src/language-server/ranger-generator';
import { createObjectGenerator, hover, parseDocument, properties } from '../../../../src/utils/test';

describe('regex()', () => {
    const document = `
    Entity Test {
        iban: /DE\\d{20}/
        email: /john\\.doe@(gmail|outlook)\\.com/
    }`;

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        range(20).forEach((_) => {
            const output = generator.next();

            expect(output.iban).toMatch(/DE\d{20}/);
            expect(output.email).toMatch(/john\.doe@(gmail|outlook)\.com/);
        });
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [iban, _email] = properties(doc);
        const ibanValue = rangerGenerator.getValue(iban);

        expect(hover(iban)).toBe(`iban: "${ibanValue}"`);

        expect(hover(iban.value)).toBe(dedent`
        /DE\\d{20}/ : regex
        \n---\n
        Generates a random string that matches given [Regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions).

        Example: "${ibanValue}"`);
    });
});
