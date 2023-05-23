import {
    AbstractFormatter,
    AstNode,
    CstNode,
    Formatting,
    FormattingAction,
    FormattingContext,
    isRootCstNode,
    LangiumDocument,
} from 'langium';
import { FormattingOptions, Range, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { hasErrors, relativePath, resolvePath } from '../utils/documents';
import * as ast from './generated/ast';

export class RangerFormatter extends AbstractFormatter {
    constructor(public formatOnErrors = false) {
        super();
    }

    override doDocumentFormat(document: LangiumDocument, options: FormattingOptions, range?: Range): TextEdit[] {
        if (hasErrors(document) && !this.formatOnErrors) {
            return [];
        }

        let textEdits: TextEdit[] = [];

        textEdits.push(...this.stripLeadingWhitespace(document.textDocument));
        textEdits.push(...this.formatImports(document));
        textEdits.push(...super.doDocumentFormat(document, options, range));
        textEdits.push(...this.stripTrailingWhitespace(document.textDocument));

        textEdits = textEdits.filter((edit) => this.isNecessary(edit, document.textDocument));
        textEdits = this.avoidOverlappingEdits(document.textDocument, textEdits);

        return textEdits;
    }

    override format(node: AstNode): void {
        const formatter = this.getNodeFormatter(node);
        if (ast.isObj(node)) {
            const bracesOpen = formatter.keyword('{');
            const bracesClose = formatter.keyword('}');
            const interior = formatter.interior(bracesOpen, bracesClose);
            interior.prepend(Formatting.indent({ allowMore: true }));
            bracesClose.prepend(Formatting.newLine());
            if (ast.isEntity(node.$container)) {
                formatter.node(node.$container).prepend(Formatting.noIndent());
                bracesClose.append(Formatting.newLines(2));
            }
        } else if (ast.isProperty(node)) {
            const value = formatter.node(node.value);
            value.prepend(Formatting.spaces(1));
        }
    }

    stripLeadingWhitespace(textDocument: TextDocument): TextEdit[] {
        const match = textDocument.getText().match(/^\s+/);
        if (match) {
            const range = {
                start: textDocument.positionAt(0),
                end: textDocument.positionAt(match[0].length),
            };
            return [{ range, newText: '' }];
        }
        return [];
    }

    stripTrailingWhitespace(textDocument: TextDocument): TextEdit[] {
        const match = textDocument.getText().match(/\s*$/);
        if (match) {
            const textLength = textDocument.getText().length;
            const range = {
                start: textDocument.positionAt(textLength - match[0].length),
                end: textDocument.positionAt(textLength),
            };
            return [{ range, newText: '\n' }];
        }
        return [];
    }

    formatImports(document: LangiumDocument): TextEdit[] {
        const textDocument = document.textDocument;
        const doc = document.parseResult.value as ast.Document;

        let start = doc.imports.first()?.$cstNode?.offset;
        let end = doc.imports.last()?.$cstNode?.end;

        if (start === undefined || end === undefined) {
            return [];
        }

        const nextNode = textDocument.getText().substring(end).match(/\S/);
        end += nextNode?.index || 0; // Include trailing whitespace until next node

        let newText = optimizeImports(doc);

        if (nextNode) {
            newText += '\n\n';
        }

        const range = { start: textDocument.positionAt(start), end: textDocument.positionAt(end) };
        return [{ range, newText }];
    }

    override createTextEdit(
        a: CstNode | undefined,
        b: CstNode,
        formatting: FormattingAction,
        context: FormattingContext,
    ): TextEdit[] {
        // Fix for no blank lines between Entities if they have a comment on top
        if (b.hidden && b.text.match(/\/[/*]/) && isRootCstNode(b.parent)) {
            b = {
                parent: b.parent,
                text: b.text,
                root: b.root,
                feature: b.feature,
                element: b.element,
                range: b.range,
                offset: b.offset,
                length: b.length,
                end: b.end,
                hidden: false,
            };
        }
        return super.createTextEdit(a, b, formatting, context);

        // Add trailing commas to properties
        // if (ast.isProperty(b.element) && !b.text.endsWith(',')) {
        //     const textEdit: TextEdit = {
        //         range: b.range,
        //         newText: b.text.trimEnd() + ',',
        //     };
        //     return [textEdit];
        // }
    }
}

function optimizeImports(document: ast.Document) {
    const imports = getUniqueImports(document);
    const optimized: string[] = [];

    for (let [filePath, entities] of imports) {
        const relPath = relativePath(filePath, document);
        const sortedEntities = entities.toArray().sort().join(', ');
        optimized.push(`from "${relPath}" import ${sortedEntities}`);
    }

    const result = optimized.sort().join('\n');
    return result;
}

/**
 * Returns unique imported Entities.
 *
 * @returns Mapping of file paths to imported Entities.
 */
function getUniqueImports(document: ast.Document): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();

    for (let imp of document.imports) {
        const filePath = resolvePath(imp.filePath, document);
        if (!result.has(filePath)) {
            result.set(filePath, new Set());
        }

        for (let entityRef of imp.entities) {
            const entityName = entityRef.$cstNode?.text;
            if (entityName) {
                result.get(filePath)!.add(entityName);
            }
        }
    }

    return result;
}
