// Copied from langium/src/test/langium-test.js

/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import fs from 'fs';
import {
    AstNode,
    escapeRegExp,
    findNodeForProperty,
    LangiumDocument,
    LangiumServices,
    Properties,
    SemanticTokensDecoder,
} from 'langium';
import { NodeFileSystem } from 'langium/node';
import path from 'path';
import { nativeMath, Random } from 'random-js';
import tmp from 'tmp';
import { expect as expectFunction } from 'vitest';
import {
    CancellationTokenSource,
    CompletionItem,
    Diagnostic,
    DiagnosticSeverity,
    DocumentSymbol,
    FormattingOptions,
    MarkupContent,
    Position,
    Range,
    ReferenceParams,
    SemanticTokensParams,
    SemanticTokenTypes,
    TextDocumentIdentifier,
    TextDocumentPositionParams,
    TextEdit,
} from 'vscode-languageserver';
import { CodeActionParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction } from 'vscode-languageserver-types';

import { Document } from '../language-server/generated/ast';
import { RangerFormatter } from '../language-server/ranger-formatter';
import { createRangerServices } from '../language-server/ranger-module';
import { parseDocument } from './documents';

export const services = createRangerServices(NodeFileSystem).Ranger;

export function clearIndex() {
    const documentUris = services.shared.workspace.LangiumDocuments.all.map((doc) => doc.uri).toArray();
    services.shared.workspace.IndexManager.remove(documentUris);
}

function expectEqual(actual: unknown, expected: unknown, message?: string) {
    expectFunction(actual, message).toEqual(expected);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Temporary files
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function createTempFile(options?: tmp.FileOptions & { data?: string }) {
    const tmpFile = tmp.fileSync(options);
    fs.writeFileSync(tmpFile.fd, options?.data || '');
    tmpFile.name = escapePath(tmpFile.name);
    return tmpFile;
}

export function createTempDir(options?: tmp.DirOptions) {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true, ...options });
    tmpDir.name = escapePath(tmpDir.name);
    return {
        ...tmpDir,
        createFile: function (fileName: string, data = '') {
            const filePath = path.join(tmpDir.name, fileName);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, data);
            return { name: escapePath(filePath), data };
        },
    };
}

export function expectFileContent(filePath: string, expectedContent: string) {
    const actualContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
    expectEqual(actualContent, expectedContent);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Parse Document
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

type ParseInput = string | { text: string; filePath?: string; includeImports?: boolean };

const random = new Random(nativeMath);

export async function parse(input: ParseInput): Promise<LangiumDocument<Document> & { doc: Document }> {
    const fileExtension = services.LanguageMetaData.fileExtensions[0];
    input = typeof input === 'string' ? { text: input } : input;
    const docSpec = {
        filePath: input.filePath || `/${random.integer(1000000, 2000000)}${fileExtension}`,
        text: input.text,
    };
    const document = await parseDocument({
        services,
        docSpec,
        strictMode: false,
        includeImports: input.includeImports,
    });
    return document;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Validations (Errors, Warnings, Infos, etc.)
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function expectError<N extends AstNode = AstNode>(
    document: LangiumDocument,
    code: string,
    assertion?: DiagnosticAssertion<N>,
): void {
    expectIssue<N>(document, { severity: DiagnosticSeverity.Error, code }, assertion);
}

export function expectWarning<N extends AstNode = AstNode>(
    document: LangiumDocument,
    code: string,
    assertion?: DiagnosticAssertion<N>,
): void {
    expectIssue<N>(document, { severity: DiagnosticSeverity.Warning, code }, assertion);
}

export function expectInfo<N extends AstNode = AstNode>(
    document: LangiumDocument,
    code: string,
    assertion?: DiagnosticAssertion<N>,
): void {
    expectIssue<N>(document, { severity: DiagnosticSeverity.Information, code }, assertion);
}

export function expectHint<N extends AstNode = AstNode>(
    document: LangiumDocument,
    code: string,
    assertion?: DiagnosticAssertion<N>,
): void {
    expectIssue<N>(document, { severity: DiagnosticSeverity.Hint, code }, assertion);
}

export function expectNoIssues(document: LangiumDocument, filter?: DiagnosticFilter) {
    const issues = findIssues(document, filter);
    expectEqual(issues.length == 0, true, `Expected no issues, but got: ${diagnosticsString(document)}`);
}

export function expectIssue<N extends AstNode = AstNode>(
    document: LangiumDocument,
    filter?: DiagnosticFilter,
    assertion?: DiagnosticAssertion<N>,
): void {
    let issues = findIssues(document, filter);
    expectEqual(
        issues.length > 0,
        true,
        `Missing ${severityString(filter?.severity) || 'ISSUE'} of type [${filter?.code || '<ANY>'}], ` +
            `only got: ${diagnosticsString(document)}`,
    );
    if (!assertion) return;

    const range = findRangeForAssertion(assertion, document.textDocument);
    issues = issues.filter((issue) => isRangeEqual(issue.range, range));

    if (assertion.message !== undefined) {
        if (typeof assertion.message === 'string') {
            issues = issues.filter((issue) => issue.message === assertion.message);
        } else if (assertion.message instanceof RegExp) {
            const regex = assertion.message as RegExp;
            issues = issues.filter((issue) => regex.test(issue.message));
        }
    }

    const replacer = (key: string, value: any) => (key === 'node' ? `(${value?.$type}) ${value?.name}` : value);
    expectEqual(
        issues.length > 0,
        true,
        `None of the ${severityString(filter?.severity) || 'ISSUE'}s found ` +
            `matches ${JSON.stringify(assertion, replacer)}: ${diagnosticsString(document)}`,
    );
}

export function findIssues(document: LangiumDocument, filter?: DiagnosticFilter): Diagnostic[] {
    if (!document.diagnostics) {
        return [];
    }
    return document.diagnostics
        .filter((d) => !filter?.severity || d.severity === filter.severity)
        .filter((d) => !filter?.code || d.code === filter.code);
}

function findRangeForAssertion<T extends AstNode>(assertion: DiagnosticAssertion<T>, doc: TextDocument): Range {
    let range: Range = { start: { line: -1, character: -1 }, end: { line: -1, character: -1 } };
    if ('node' in assertion && assertion.node) {
        const name = typeof assertion.property === 'string' ? assertion.property : assertion.property.name;
        const index = typeof assertion.property === 'string' ? undefined : assertion.property.index;
        const cstNode = findNodeForProperty(assertion.node.$cstNode, name, index);
        if (!cstNode) throw new Error('Cannot find the node!');
        range = cstNode.range;
    } else if ('offset' in assertion) {
        range = {
            start: doc.positionAt(assertion.offset),
            end: doc.positionAt(assertion.offset + assertion.length),
        };
    } else if ('range' in assertion) {
        range = assertion.range;
    }
    return range;
}

interface DiagnosticFilter {
    code?: string;
    severity?: DiagnosticSeverity;
}

/**
 * Assert that a diagnostic is attached to a specific AstNode, Range or text offset.
 *
 * Specify either (node, property) or (range) or (offset, length).
 */
type DiagnosticAssertion<T extends AstNode> = NodeAssertion<T> | RangeAssertion | OffsetAssertion;
interface NodeAssertion<T extends AstNode> extends MessageAssertion {
    node: T;
    property: Properties<T> | { name: Properties<T>; index?: number };
}
interface RangeAssertion extends MessageAssertion {
    range: Range;
}
interface OffsetAssertion extends MessageAssertion {
    offset: number;
    length: number;
}
interface MessageAssertion {
    message?: string | RegExp;
}

function diagnosticsString(document: LangiumDocument): string {
    const diagnostics = document.diagnostics || [];
    return '[\n' + diagnostics.map((d) => `  ${diagnosticString(d)}`).join('\n') + '\n]';
}

function diagnosticString(diag: Diagnostic): string {
    return `${severityString(diag.severity)} (${diag.code}: ${diag.message}) (${rangeString(diag.range)})`;
}

function rangeString(range: Range): string {
    return `${range.start.line}:${range.start.character}->${range.end.line}:${range.end.character}`;
}

function severityString(severity?: DiagnosticSeverity): string | undefined {
    switch (severity) {
        case DiagnosticSeverity.Error:
            return 'ERROR';
        case DiagnosticSeverity.Warning:
            return 'WARNING';
        case DiagnosticSeverity.Information:
            return 'INFO';
        case DiagnosticSeverity.Hint:
            return 'HINT';
        default:
            return undefined;
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Quick Fixes
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function testQuickFix(input: { before: string; after: string }) {
    const document = await parse(input.before);
    const params: CodeActionParams = {
        textDocument: document.textDocument,
        range: { start: { line: 1, character: 1 }, end: { line: 1, character: 1 } },
        context: { diagnostics: document.diagnostics || [] },
    };
    const codeActions = await services.lsp.CodeActionProvider?.getCodeActions(document, params);
    const codeAction = codeActions
        ?.filter((ac) => CodeAction.is(ac))
        .map((ac) => ac as CodeAction)
        .sort((ac1, ac2) => Number(ac1.isPreferred) - Number(ac2.isPreferred))
        .first();
    const changes = codeAction?.edit?.changes || {};
    const edit = (changes[document.textDocument.uri] || [])[0];
    if (edit) {
        TextDocument.update(document.textDocument, [{ range: edit.range, text: edit.newText }], 1);
    }
    const fixed = document.textDocument.getText();
    expectEqual(fixed, input.after);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Symbols
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ExpectedBase {
    text: string;
    indexMarker?: string;
    rangeStartMarker?: string;
    rangeEndMarker?: string;
}

export interface ExpectedSymbols extends ExpectedBase {
    expectedSymbols: DocumentSymbol[];
}

export async function expectSymbols(input: ExpectedSymbols): Promise<void> {
    const symbolProvider = services.lsp.DocumentSymbolProvider;
    const document = await parse(input.text);

    const symbols = (await symbolProvider?.getSymbols(document, textDocumentParams(document))) ?? [];

    expectEqual(
        symbols.length,
        input.expectedSymbols.length,
        `Expected ${input.expectedSymbols.length} but found ${symbols.length} symbols in document.`,
    );

    for (let i = 0; i < input.expectedSymbols.length; i++) {
        const expected = input.expectedSymbols[i];
        const item = symbols[i];
        if (typeof expected === 'string') {
            expectEqual(item.name, expected);
        } else {
            expectEqual(item, expected);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Foldings
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function expectFoldings(services: LangiumServices): (input: ExpectedBase) => Promise<void> {
    return async (input) => {
        const { output, ranges } = replaceIndices(input);
        const document = await parse(output);
        const foldingRangeProvider = services.lsp.FoldingRangeProvider;
        const foldings = (await foldingRangeProvider?.getFoldingRanges(document, textDocumentParams(document))) ?? [];
        foldings.sort((a, b) => a.startLine - b.startLine);
        expectEqual(
            foldings.length,
            ranges.length,
            `Expected ${ranges.length} but received ${foldings.length} foldings`,
        );
        for (let i = 0; i < ranges.length; i++) {
            const expected = ranges[i];
            const item = foldings[i];
            const expectedStart = document.textDocument.positionAt(expected[0]);
            const expectedEnd = document.textDocument.positionAt(expected[1]);
            expectEqual(
                item.startLine,
                expectedStart.line,
                `Expected folding start at line ${expectedStart.line} but received folding start at line ${item.startLine} instead.`,
            );
            expectEqual(
                item.endLine,
                expectedEnd.line,
                `Expected folding end at line ${expectedEnd.line} but received folding end at line ${item.endLine} instead.`,
            );
        }
    };
}

function textDocumentParams(document: LangiumDocument): { textDocument: TextDocumentIdentifier } {
    return { textDocument: { uri: document.textDocument.uri } };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Completions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ExpectedCompletion extends ExpectedBase {
    index: number;
    expectedItems: Array<string | CompletionItem>;
}

export function expectCompletion(services: LangiumServices): (completion: ExpectedCompletion) => Promise<void> {
    return async (expectedCompletion) => {
        const { output, indices } = replaceIndices(expectedCompletion);
        const document = await parse(output);
        const completionProvider = services.lsp.CompletionProvider;
        const offset = indices[expectedCompletion.index];
        const completions = (await completionProvider?.getCompletion(
            document,
            getPositionParams(document, offset),
        )) ?? { items: [] };
        const expectedItems = expectedCompletion.expectedItems;
        const items = completions.items.sort((a, b) => a.sortText?.localeCompare(b.sortText || '0') || 0);
        expectEqual(
            items.length,
            expectedItems.length,
            `Expected ${expectedItems.length} but received ${items.length} completion items`,
        );
        for (let i = 0; i < expectedItems.length; i++) {
            const expected = expectedItems[i];
            const completion = items[i];
            if (typeof expected === 'string') {
                expectEqual(completion.label, expected);
            } else {
                expectEqual(completion, expected);
            }
        }
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GoToDefinition
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ExpectedGoToDefinition extends ExpectedBase {
    index: number;
    rangeIndex: number | number[];
}

export async function expectGoToDefinition(expected: ExpectedGoToDefinition): Promise<void> {
    const definitionProvider = services.lsp.DefinitionProvider;
    const { output, indices, ranges } = replaceIndices(expected);
    const document = await parse(output);
    const positionParams = getPositionParams(document, indices[expected.index]);

    let locationLinks = (await definitionProvider?.getDefinition(document, positionParams)) ?? [];

    const rangeIndex = expected.rangeIndex;
    if (Array.isArray(rangeIndex)) {
        expectEqual(
            locationLinks.length,
            rangeIndex.length,
            `Expected ${rangeIndex.length} definitions but received ${locationLinks.length}`,
        );
        for (const index of rangeIndex) {
            const expectedRange: Range = {
                start: document.textDocument.positionAt(ranges[index][0]),
                end: document.textDocument.positionAt(ranges[index][1]),
            };
            const range = locationLinks[0].targetSelectionRange;
            expectEqual(
                range,
                expectedRange,
                `Expected range ${rangeToString(expectedRange)} does not match actual range ${rangeToString(range)}`,
            );
        }
    } else {
        const expectedRange: Range = {
            start: document.textDocument.positionAt(ranges[rangeIndex][0]),
            end: document.textDocument.positionAt(ranges[rangeIndex][1]),
        };
        expectEqual(locationLinks.length, 1, `Expected a single definition but received ${locationLinks.length}`);
        const range = locationLinks[0].targetSelectionRange;
        expectEqual(
            range,
            expectedRange,
            `Expected range ${rangeToString(expectedRange)} does not match actual range ${rangeToString(range)}`,
        );
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// References
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ExpectedFindReferences extends ExpectedBase {
    includeDeclaration: boolean;
}

export function expectFindReferences(
    services: LangiumServices,
): (expectedFindReferences: ExpectedFindReferences) => Promise<void> {
    return async (expectedFindReferences) => {
        const { output, indices, ranges } = replaceIndices(expectedFindReferences);
        const document = await parse(output);
        const expectedRanges: Range[] = ranges.map((range) => ({
            start: document.textDocument.positionAt(range[0]),
            end: document.textDocument.positionAt(range[1]),
        }));
        const referenceFinder = services.lsp.ReferencesProvider;
        for (const index of indices) {
            const referenceParameters = referenceParams(document, index, expectedFindReferences.includeDeclaration);
            const references = (await referenceFinder?.findReferences(document, referenceParameters)) ?? [];

            expectEqual(
                references.length,
                expectedRanges.length,
                'Found references do not match amount of expected references',
            );
            for (const reference of references) {
                expectEqual(
                    expectedRanges.some((range) => isRangeEqual(range, reference.range)),
                    true,
                    `Found unexpected reference at range ${rangeToString(reference.range)}`,
                );
            }
        }
        clearDocuments(services);
    };
}

function referenceParams(document: LangiumDocument, offset: number, includeDeclaration: boolean): ReferenceParams {
    return {
        textDocument: { uri: document.textDocument.uri },
        position: document.textDocument.positionAt(offset),
        context: { includeDeclaration },
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hovers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ExpectedHover extends ExpectedBase {
    index: number;
    hover?: string | RegExp;
}

export function expectHover(services: LangiumServices): (expectedHover: ExpectedHover) => Promise<void> {
    return async (expectedHover) => {
        const { output, indices } = replaceIndices(expectedHover);
        const document = await parse(output);
        const hoverProvider = services.lsp.HoverProvider;
        const hover = await hoverProvider?.getHoverContent(
            document,
            getPositionParams(document, indices[expectedHover.index]),
        );
        const hoverContent = hover && MarkupContent.is(hover.contents) ? hover.contents.value : undefined;
        if (typeof expectedHover.hover !== 'object') {
            expectEqual(hoverContent, expectedHover.hover);
        } else {
            const value = hoverContent ?? '';
            expectEqual(
                expectedHover.hover.test(value),
                true,
                `Hover '${value}' does not match regex /${expectedHover.hover.source}/${expectedHover.hover.flags}.`,
            );
        }
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Formatting
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ExpectFormatting {
    before: string;
    after: string;
    range?: Range;
    options?: FormattingOptions;
}

export async function testFormatting(expected: ExpectFormatting) {
    const formatter = services.lsp.Formatter as RangerFormatter;
    formatter.formatOnErrors = true;

    const document = await parse({ text: expected.before, includeImports: false });
    const textDocument = { uri: document.uri.toString() };

    const options = expected.options ?? {
        insertSpaces: true,
        tabSize: 4,
    };

    let textEdits: TextEdit[];
    if (expected.range) {
        textEdits = await formatter.formatDocumentRange(document, { options, textDocument, range: expected.range });
    } else {
        textEdits = await formatter.formatDocument(document, { options, textDocument });
    }

    const editedDocument = TextDocument.applyEdits(document.textDocument, textEdits);
    expectEqual(editedDocument, expected.after);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Semantic Tokens
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface DecodedSemanticTokensWithRanges {
    tokens: SemanticTokensDecoder.DecodedSemanticToken[];
    ranges: Array<[number, number]>;
}

export async function highlight(input: string): Promise<DecodedSemanticTokensWithRanges> {
    const tokenProvider = services.lsp.SemanticTokenProvider!;
    const { output, ranges } = replaceIndices({ text: input });
    const document = await parse(output);
    const params: SemanticTokensParams = { textDocument: { uri: document.textDocument.uri } };
    const tokens = await tokenProvider.semanticHighlight(document, params, new CancellationTokenSource().token);
    return { tokens: SemanticTokensDecoder.decode(tokens, document), ranges };
}

export interface DecodedTokenOptions {
    rangeIndex?: number;
    tokenType: SemanticTokenTypes;
}

export function expectSemanticToken(
    tokensWithRanges: DecodedSemanticTokensWithRanges,
    options: DecodedTokenOptions,
): void {
    const range = tokensWithRanges.ranges[options.rangeIndex || 0];
    const result = tokensWithRanges.tokens.filter((t) => {
        return t.tokenType === options.tokenType && t.offset === range[0] && t.offset + t.text.length === range[1];
    });
    expectEqual(result.length, 1, `Expected one token with the specified options but found ${result.length}`);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Utility functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function getPositionParams(document: LangiumDocument, position: Position | number): TextDocumentPositionParams {
    position = typeof position === 'object' ? position : document.textDocument.positionAt(position);
    return { textDocument: { uri: document.textDocument.uri }, position };
}

export type Predicate<T> = (arg: T) => boolean;

export function isRangeEqual(lhs: Range, rhs: Range): boolean {
    return (
        lhs.start.character === rhs.start.character &&
        lhs.start.line === rhs.start.line &&
        lhs.end.character === rhs.end.character &&
        lhs.end.line === rhs.end.line
    );
}

export function isRangeInside(outer: Range, inner: Range): boolean {
    if (outer.start.line > inner.start.line) return false;
    if (outer.end.line < inner.end.line) return false;
    if (outer.start.line == inner.start.line && outer.start.character > inner.start.character) return false;
    if (outer.end.line == inner.end.line && outer.end.character < inner.end.character) return false;
    return true;
}

/**
 * Parse range from string.
 *
 * Example:
 * ```ts
 * '1:0-2:10'
 * ```
 * returns
 * ```ts
 * {
 *   start: {line: 1, character: 0},
 *   end: {line: 2, character: 10}
 * }
 * ```
 *
 */
export function range(range: string): Range {
    let [start, end] = range.split('-');
    let [stLine, stChar] = start.split(':');
    let [enLine, enChar] = end.split(':');
    return {
        start: { line: Number(stLine), character: Number(stChar) },
        end: { line: Number(enLine), character: Number(enChar) },
    };
}

function rangeToString(range: Range): string {
    return `${range.start.line}:${range.start.character}--${range.end.line}:${range.end.character}`;
}

export function clearDocuments(services: LangiumServices): Promise<void> {
    const allDocs = services.shared.workspace.LangiumDocuments.all.map((x) => x.uri).toArray();
    return services.shared.workspace.DocumentBuilder.update([], allDocs);
}

function replaceIndices(base: ExpectedBase): { output: string; indices: number[]; ranges: Array<[number, number]> } {
    const indices: number[] = [];
    const ranges: Array<[number, number]> = [];
    const rangeStack: number[] = [];
    const indexMarker = base.indexMarker || '<|>';
    const rangeStartMarker = base.rangeStartMarker || '<|';
    const rangeEndMarker = base.rangeEndMarker || '|>';
    const regex = new RegExp(
        `${escapeRegExp(indexMarker)}|${escapeRegExp(rangeStartMarker)}|${escapeRegExp(rangeEndMarker)}`,
    );

    let matched = true;
    let input = base.text;

    while (matched) {
        const regexMatch = regex.exec(input);
        if (regexMatch) {
            const matchedString = regexMatch[0];
            switch (matchedString) {
                case indexMarker:
                    indices.push(regexMatch.index);
                    break;
                case rangeStartMarker:
                    rangeStack.push(regexMatch.index);
                    break;
                case rangeEndMarker: {
                    const rangeStart = rangeStack.pop() || 0;
                    ranges.push([rangeStart, regexMatch.index]);
                    break;
                }
            }
            input = input.substring(0, regexMatch.index) + input.substring(regexMatch.index + matchedString.length);
        } else {
            matched = false;
        }
    }

    return { output: input, indices, ranges: ranges.sort((a, b) => a[0] - b[0]) };
}

/**
 * Escape Backslashes in file path to make tests work on Windows.
 */
export function escapePath(filePath: string) {
    return filePath.replace(/\\/g, '/');
}
