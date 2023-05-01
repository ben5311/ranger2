import dedent from 'dedent-js';
import { beforeEach, describe, expect, test } from 'vitest';
import { SymbolKind } from 'vscode-languageserver';

import { RangerDocumentSymbolProvider, RangerWorkspaceSymbolProvider } from '../../src/language-server/ranger-symbols';
import { clearIndex, parse, range, services } from '../../src/utils/test';

beforeEach(() => {
    clearIndex();
});

describe('RangerDocumentSymbolProvider', () => {
    test('Symbols', async () => {
        const symbolProvider = new RangerDocumentSymbolProvider(services);
        let document = await parse(dedent`
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
                kind: SymbolKind.Class,
                name: 'User',
                detail: undefined,
                range: range('0:0-8:1'),
                selectionRange: range('0:7-0:11'),
                children: [
                    {
                        kind: SymbolKind.Field,
                        name: 'name',
                        detail: '"John Doe"',
                        range: range('1:4-1:20'),
                        selectionRange: range('1:4-1:8'),
                        children: undefined,
                    },
                    {
                        kind: SymbolKind.Field,
                        name: 'age',
                        detail: '28',
                        range: range('2:4-2:11'),
                        selectionRange: range('2:4-2:7'),
                        children: undefined,
                    },
                    {
                        kind: SymbolKind.Field,
                        name: 'married',
                        detail: 'false',
                        range: range('3:4-3:18'),
                        selectionRange: range('3:4-3:11'),
                        children: undefined,
                    },
                    {
                        kind: SymbolKind.Field,
                        name: 'address',
                        detail: undefined,
                        range: range('4:4-7:5'),
                        selectionRange: range('4:4-4:11'),
                        children: [
                            {
                                kind: SymbolKind.Field,
                                name: 'phone',
                                detail: 'null',
                                range: range('5:8-5:19'),
                                selectionRange: range('5:8-5:13'),
                                children: undefined,
                            },
                            {
                                kind: SymbolKind.Field,
                                name: 'email',
                                detail: '"john.doe@gmail.com"',
                                range: range('6:8-6:35'),
                                selectionRange: range('6:8-6:13'),
                                children: undefined,
                            },
                        ],
                    },
                ],
            },
        ]);
    });
});

describe('RangerWorkspaceSymbolProvider', () => {
    test('Symbols', async () => {
        const symbolProvider = new RangerWorkspaceSymbolProvider(services);
        await parse({
            filePath: '/User.ranger',
            text: `
            Entity User {}
            Entity Account {}
            Entity Address {}
            `,
        });

        let symbols = symbolProvider.provideSymbols({ query: '' });
        let expectedUri = process.platform === 'win32' ? 'file:///c%3A/User.ranger' : 'file:///User.ranger';
        expect(symbols).toStrictEqual([
            {
                name: 'User',
                kind: 5,
                location: { uri: expectedUri },
            },
            {
                name: 'Account',
                kind: 5,
                location: { uri: expectedUri },
            },
            {
                name: 'Address',
                kind: 5,
                location: { uri: expectedUri },
            },
        ]);
    });
});
