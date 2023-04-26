import { AssertionError } from 'assert';
import fs from 'fs';
import { AstNode, getDocument, isAstNode, LangiumDocument, LangiumServices } from 'langium';
import path from 'path';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { URI } from 'vscode-uri';

import { Document } from '../language-server/generated/ast';

/**
 * A Ranger Document specification.
 *
 * If you only provide filePath, the Document will be loaded from the file system.
 *
 * If you pass the text argument as well, the document will not be loaded from the disk,
 * and the file path will only be used to create the Document URI.
 */
export type DocumentSpec = { filePath: string; text?: string };

/**
 * Parse a Ranger Document from file or string.
 */
export async function parseDocument(services: LangiumServices, docSpec: DocumentSpec) {
    const { DocumentBuilder } = services.shared.workspace;

    const imported: LangiumDocument[] = [];
    const document = await doParseDocument(services, docSpec, imported);

    await DocumentBuilder.build(imported, { validationChecks: 'all' });

    const validationErrors = (document.diagnostics ?? []).filter((e) => e.severity === 1);
    if (validationErrors.length > 0) {
        const errors = validationErrors
            .map((e) => `Line ${e.range.start.line + 1}: ${e.message} [${document.textDocument.getText(e.range)}]`)
            .join('\n');
        throw new AssertionError({ message: `There are validation errors:\n${errors}` });
    }

    return { document, parseResult: document.parseResult.value };
}

/**
 * Parse a Ranger Document and its imports.
 */
async function doParseDocument(services: LangiumServices, docSpec: DocumentSpec, imported: LangiumDocument[]) {
    const extensions = services.LanguageMetaData.fileExtensions;
    const { LangiumDocuments, LangiumDocumentFactory } = services.shared.workspace;

    let documentUri = fileURI(path.resolve(docSpec.filePath));
    let document: LangiumDocument<Document>;

    if (docSpec.text) {
        document = LangiumDocumentFactory.fromString(docSpec.text, documentUri);
        LangiumDocuments.addDocument(document);
    } else {
        if (!extensions.includes(path.extname(docSpec.filePath))) {
            throw `Please choose a file with one of these extensions: [${extensions}].`;
        }

        if (!fs.existsSync(docSpec.filePath)) {
            throw `File [${docSpec.filePath}] does not exist.`;
        }

        document = LangiumDocuments.getOrCreateDocument(documentUri) as LangiumDocument<Document>;
    }

    imported.push(document);

    for (const import_ of document.parseResult?.value.imports || []) {
        const filePath = resolvePath(import_.filePath.value, document);
        const fileUri = URI.file(filePath);
        if (!LangiumDocuments.hasDocument(fileUri)) {
            await doParseDocument(services, { filePath }, imported);
        }
    }

    return document;
}

export async function buildDocument(services: LangiumServices, filePath: string | URI) {
    const documentUri = typeof filePath === 'string' ? fileURI(filePath) : filePath;
    const document = services.shared.workspace.LangiumDocuments.getOrCreateDocument(documentUri);
    await services.shared.workspace.DocumentBuilder.build([document], { validationChecks: 'all' });
    return document as LangiumDocument<Document>;
}

/**
 * Returns true if the Document has validation errors.
 */
export function hasErrors(document: LangiumDocument): boolean {
    return !!document.diagnostics?.filter((d) => d.severity === DiagnosticSeverity.Error).length;
}

/**
 * Returns true if the Document has no validation errors.
 */
export function hasNoErrors(document: LangiumDocument): boolean {
    return !hasErrors(document);
}

/**
 * Resolve file path relative to Document.
 */
export function resolvePath(filePath: string, context: AstNode | LangiumDocument): string {
    if (path.isAbsolute(filePath)) {
        return filePath;
    }

    let document = isAstNode(context) ? getDocument(context) : context;
    const docFilePath = document.uri.fsPath;
    const resolved = path.join(path.dirname(docFilePath), filePath);
    return resolved;
}

export function isRangerFile(filePath: string | URI) {
    return filePath && filePath.toString().endsWith('.ranger') && fs.existsSync(filePath.toString());
}

export function parseURI(uri: string): URI {
    return URI.parse(uri);
}

/**
 * Convert file path to URI.
 */
export function fileURI(filePath: string): URI {
    return URI.file(filePath);
}
