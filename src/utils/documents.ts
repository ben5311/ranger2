import chalk from 'chalk';
import fs from 'fs';
import { LangiumDocument, LangiumServices } from 'langium';
import path from 'path';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { URI } from 'vscode-uri';

import { Document } from '../language-server/generated/ast';

/**
 * A Ranger Document spec that can be provided either as file path or file content.
 */
export type DocumentSpec = { filePath: string } | { text: string };

/**
 * Parse a Ranger document from file or string.
 */
export async function parseDocument(services: LangiumServices, docSpec: DocumentSpec) {
    const extensions = services.LanguageMetaData.fileExtensions;
    const { LangiumDocuments, LangiumDocumentFactory, DocumentBuilder } = services.shared.workspace;
    let documentUri: URI;
    let document: LangiumDocument<Document>;

    if ('filePath' in docSpec) {
        if (!extensions.includes(path.extname(docSpec.filePath))) {
            throw `Please choose a file with one of these extensions: [${extensions}].`;
        }

        if (!fs.existsSync(docSpec.filePath)) {
            throw `File [${docSpec.filePath}] does not exist.`;
        }

        documentUri = URI.file(path.resolve(docSpec.filePath));
        document = LangiumDocuments.getOrCreateDocument(documentUri) as LangiumDocument<Document>;
    } else {
        const randomNumber = Math.floor(Math.random() * 10000000) + 1000000;
        documentUri = URI.parse(`file:///${randomNumber}${extensions[0]}`);
        document = LangiumDocumentFactory.fromString(docSpec.text, documentUri);
        LangiumDocuments.addDocument(document);
    }

    await DocumentBuilder.build([document], { validationChecks: 'all' });

    const validationErrors = (document.diagnostics ?? []).filter((e) => e.severity === 1);
    if (validationErrors.length > 0) {
        console.error(chalk.red('There are validation errors:'));
        for (const validationError of validationErrors) {
            const lineNumber = validationError.range.start.line + 1;
            const text = document.textDocument.getText(validationError.range);
            console.error(chalk.red(`line ${lineNumber}: ${validationError.message} [${text}]`));
        }
        process.exit(1);
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
