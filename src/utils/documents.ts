import fs from 'fs';
import { AstNode, isAstNode, LangiumDocument, LangiumServices } from 'langium';
import path from 'path';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { URI } from 'vscode-uri';

import { Document } from '../language-server/generated/ast';

/**
 * A Ranger Document spec.
 *
 * When providing only the filePath, the Document will be loaded
 * by reading the file content from disk.
 *
 * If you pass the text argument, the file will not be loaded from disk and
 * the filePath will only be used to create the Document URI.
 */
export type DocumentSpec = { filePath: string; text?: string };

/**
 * Parse a Ranger document from file or string.
 */
export async function parseDocument(services: LangiumServices, docSpec: DocumentSpec) {
    const extensions = services.LanguageMetaData.fileExtensions;
    const { LangiumDocuments, LangiumDocumentFactory, DocumentBuilder } = services.shared.workspace;

    let documentUri = URI.file(path.resolve(docSpec.filePath));
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

    await DocumentBuilder.build([document], { validationChecks: 'all' });

    const validationErrors = (document.diagnostics ?? []).filter((e) => e.severity === 1);
    if (validationErrors.length > 0) {
        const errors = validationErrors
            .map((e) => `Line ${e.range.start.line + 1}: ${e.message} [${document.textDocument.getText(e.range)}]`)
            .join('\n');
        throw `There are validation errors:\n${errors}`;
    }

    const parseResult = document.parseResult?.value;
    return { document, parseResult };
}

/**
 * Returns true if the LangiumDocument has validation errors.
 */
export function hasErrors(document: LangiumDocument): boolean {
    return !!document.diagnostics?.filter((d) => d.severity === DiagnosticSeverity.Error).length;
}

/**
 * Returns true if the LangiumDocument has no validation errors.
 */
export function hasNoErrors(document: LangiumDocument): boolean {
    return !hasErrors(document);
}

/**
 * Resolve file path relative to Document.
 */
export function resolvePath(filePath: string, context: AstNode | LangiumDocument): string | undefined {
    if (path.isAbsolute(filePath)) {
        return filePath;
    }

    let document: LangiumDocument;
    if (isAstNode(context)) {
        let rootNode = getRootNode(context);
        if (!rootNode?.$document) {
            return undefined;
        }
        document = rootNode.$document;
    } else {
        document = context;
    }

    const documentFile = document.uri.fsPath;
    const resolved = path.join(path.dirname(documentFile), filePath);
    return resolved;
}

export function getRootNode(node?: AstNode): AstNode | undefined {
    while (node && '$container' in node) {
        node = node.$container;
    }
    return node;
}
