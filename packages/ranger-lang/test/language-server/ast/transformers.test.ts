import { describe, expect, test } from 'vitest';

import { createObjectGenerator, hover, parseDocument, properties } from '../../../src/utils/test';

describe('Transformers', () => {
    const document = `
    Entity Test {
        name: "Dénnis Bäurer"
        lowerName: name | lower
        upperName: name | upper
        asciiName: name | ascii
        uasciName: name | upper | ascii
        trimmName: " Dennis Bäurer " | trim
    }`;

    test('Generate', async () => {
        const generator = await createObjectGenerator(document);

        const output = generator.next();

        expect(output.lowerName).toBe('dénnis bäurer');
        expect(output.upperName).toBe('DÉNNIS BÄURER');
        expect(output.asciiName).toBe('Dennis Baurer');
        expect(output.uasciName).toBe('DENNIS BAURER');
        expect(output.trimmName).toBe('Dennis Bäurer');
    });

    test('Hover', async () => {
        let doc = await parseDocument(document);

        let [_name, lowerName, upperName, asciiName, uasciName, trimmName] = properties(doc);

        expect(hover(lowerName)).toBe('lowerName: "dénnis bäurer"');
        expect(hover(upperName)).toBe('upperName: "DÉNNIS BÄURER"');
        expect(hover(asciiName)).toBe('asciiName: "Dennis Baurer"');
        expect(hover(uasciName)).toBe('uasciName: "DENNIS BAURER"');
        expect(hover(trimmName)).toBe('trimmName: "Dennis Bäurer"');

        expect(hover(lowerName.value)).toBe('name | lower\n\n"dénnis bäurer"');
        expect(hover(upperName.value)).toBe('name | upper\n\n"DÉNNIS BÄURER"');
        expect(hover(asciiName.value)).toBe('name | ascii\n\n"Dennis Baurer"');
        expect(hover(uasciName.value)).toBe('name | upper | ascii\n\n"DENNIS BAURER"');
        expect(hover(trimmName.value)).toBe('" Dennis Bäurer " | trim\n\n"Dennis Bäurer"');
    });
});
