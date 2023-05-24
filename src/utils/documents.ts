import { AssertionError } from 'assert';
import fs from 'fs';
import { AstNode, getDocument, isAstNode, LangiumDocument, LangiumServices } from 'langium';
import path from 'path';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { URI } from 'vscode-uri';

import { AFilePath, Document } from '../language-server/generated/ast';

/**
 * A Ranger Document specification.
 *
 * If you only provide filePath, the Document will be loaded from the file system.
 *
 * If you pass the text argument as well, the document will not be loaded from disk,
 * and the file path will only be used to create the Document URI.
 */
export type DocumentSpec = { filePath: string; text?: string };

export type ParseOptions = {
    services: LangiumServices;
    docSpec: DocumentSpec;
    strictMode?: boolean;
    includeImports?: boolean;
};

/**
 * Parse a Ranger Document from file or string.
 */
export async function parseDocument(opts: ParseOptions): Promise<LangiumDocument<Document> & { doc: Document }> {
    opts = {
        ...opts,
        strictMode: opts.strictMode ?? true,
        includeImports: opts.includeImports ?? true,
    };
    const { DocumentBuilder } = opts.services.shared.workspace;

    const imported: LangiumDocument[] = [];
    const document = await doParseDocument(opts, imported);

    await DocumentBuilder.build(imported, { validationChecks: 'all' });

    const validationErrors = (document.diagnostics ?? []).filter((e) => e.severity === DiagnosticSeverity.Error);
    if (opts.strictMode && validationErrors.length > 0) {
        const errors = validationErrors
            .map((e) => `Line ${e.range.start.line + 1}: ${e.message} [${document.textDocument.getText(e.range)}]`)
            .join('\n');
        throw new AssertionError({ message: `There are validation errors:\n${errors}` });
    }

    return { ...document, doc: document.parseResult.value };
}

/**
 * Parse a Ranger Document and its imports.
 */
async function doParseDocument(opts: ParseOptions, imported: LangiumDocument[]) {
    const { services, docSpec, includeImports } = opts;
    const extensions = services.LanguageMetaData.fileExtensions;
    const { LangiumDocuments, LangiumDocumentFactory } = services.shared.workspace;

    let documentUri = fileURI(docSpec.filePath);
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

    if (includeImports) {
        for (const imp of document.parseResult?.value.imports || []) {
            const filePath = resolvePath(imp.filePath, document);
            const fileUri = fileURI(filePath);
            if (!LangiumDocuments.hasDocument(fileUri)) {
                await doParseDocument({ ...opts, docSpec: { filePath } }, imported);
            }
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
 *
 * @param filePath Relative file path.
 * @returns Absolute file path.
 */
export function resolvePath(filePath: string | AFilePath, context: AstNode | LangiumDocument): string {
    filePath = typeof filePath === 'string' ? filePath : filePath.value;

    if (!path.isAbsolute(filePath)) {
        const documentDir = getDocumentDir(context);
        filePath = path.join(documentDir, filePath);
    }

    let resolved = path.resolve(filePath);
    resolved = resolved.replace(/^([A-Z]:)/, (_, drive) => drive.toLowerCase()); // Normalize Windows drive letter
    return resolved;
}

/**
 * Resolve file URI relative to Document.
 */
export function resolveURI(filePath: string | AFilePath, context: AstNode | LangiumDocument): URI {
    const absPath = resolvePath(filePath, context);
    return fileURI(absPath);
}

/**
 * Convert absolute file path to file path relative to Document.
 *
 * @param absolutePath Absolute file path.
 * @returns Relative file path.
 */
export function relativePath(absolutePath: string, context: AstNode | LangiumDocument) {
    const documentDir = getDocumentDir(context);
    let relPath = path.relative(documentDir, absolutePath);
    relPath = relPath.replace(/\\/g, '/');

    if (!relPath.startsWith('.')) {
        relPath = `./${relPath}`;
    }
    return relPath;
}

export function getDocumentUri(context: AstNode | LangiumDocument): URI {
    const document = isAstNode(context) ? getDocument(context) : context;
    return document.uri;
}

export function getDocumentPath(context: AstNode | LangiumDocument): string {
    return getDocumentUri(context).fsPath;
}

export function getDocumentDir(context: AstNode | LangiumDocument): string {
    return path.dirname(getDocumentPath(context));
}

/**
 * Convert file path to URI.
 */
export function fileURI(filePath: string): URI {
    const absPath = path.resolve(filePath);
    return URI.file(absPath);
}

export function parseURI(uri: string): URI {
    return URI.parse(uri);
}

export function isRangerFile(filePath: string | URI) {
    filePath = typeof filePath === 'string' ? filePath : filePath.fsPath;
    return !!filePath && filePath.endsWith('.ranger') && fs.existsSync(filePath);
}
