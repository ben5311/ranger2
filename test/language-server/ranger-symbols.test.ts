import { NodeFileSystem } from 'langium/node';
import { describe, expect, test } from 'vitest';

import { createRangerServices } from '../../src/language-server/ranger-module';
import { RangerSymbolProvider } from '../../src/language-server/ranger-symbols';
import { validate } from '../../src/utils/test';

describe('RangerSymbolProvider', () => {
    test('Symbols', async () => {
        const services = createRangerServices(NodeFileSystem);
        const symbolProvider = new RangerSymbolProvider(services.Ranger);
        let { document } = await validate(`
        Entity User {
            name: "John Doe"
            age: 28
            married: false
            address: {
                phone: null
                email: "john.doe@gmail.com"
            }
        }`);

        let symbols = symbolProvider.getSymbols(document);
        expect(symbols).toStrictEqual([
            {
                kind: 5,
                name: 'User',
                detail: undefined,
                range: {
                    start: { character: 8, line: 1 },
                    end: { character: 9, line: 9 },
                },
                selectionRange: {
                    start: { character: 15, line: 1 },
                    end: { character: 19, line: 1 },
                },
                children: [
                    {
                        kind: 20,
                        name: 'name',
                        detail: '"John Doe"',
                        range: {
                            start: { character: 12, line: 2 },
                            end: { character: 28, line: 2 },
                        },
                        selectionRange: {
                            start: { character: 12, line: 2 },
                            end: { character: 16, line: 2 },
                        },
                        children: undefined,
                    },
                    {
                        kind: 20,
                        name: 'age',
                        detail: '28',
                        range: {
                            start: { character: 12, line: 3 },
                            end: { character: 19, line: 3 },
                        },
                        selectionRange: {
                            start: { character: 12, line: 3 },
                            end: { character: 15, line: 3 },
                        },
                        children: undefined,
                    },
                    {
                        kind: 20,
                        name: 'married',
                        detail: 'false',
                        range: {
                            start: { character: 12, line: 4 },
                            end: { character: 26, line: 4 },
                        },
                        selectionRange: {
                            start: { character: 12, line: 4 },
                            end: { character: 19, line: 4 },
                        },
                        children: undefined,
                    },
                    {
                        kind: 20,
                        name: 'address',
                        detail: undefined,
                        range: {
                            start: { character: 12, line: 5 },
                            end: { character: 13, line: 8 },
                        },
                        selectionRange: {
                            start: { character: 12, line: 5 },
                            end: { character: 19, line: 5 },
                        },
                        children: [
                            {
                                kind: 20,
                                name: 'phone',
                                detail: 'null',
                                range: {
                                    start: { character: 16, line: 6 },
                                    end: { character: 27, line: 6 },
                                },
                                selectionRange: {
                                    start: { character: 16, line: 6 },
                                    end: { character: 21, line: 6 },
                                },
                                children: undefined,
                            },
                            {
                                kind: 20,
                                name: 'email',
                                detail: '"john.doe@gmail.com"',
                                range: {
                                    start: { character: 16, line: 7 },
                                    end: { character: 43, line: 7 },
                                },
                                selectionRange: {
                                    start: { character: 16, line: 7 },
                                    end: { character: 21, line: 7 },
                                },
                                children: undefined,
                            },
                        ],
                    },
                ],
            },
        ]);
    });
});
