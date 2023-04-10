import chalk from 'chalk';
import fs from 'fs';
import { LangiumDocument, LangiumServices } from 'langium';
import path from 'path';
import { URI } from 'vscode-uri';

import { Document } from '../language-server/generated/ast';

export type DocumentSpec = { filePath: string } | { text: string };

/**
 * Parse a Ranger document from file or string.
 */
export async function parseDocument(services: LangiumServices, doc: DocumentSpec) {
    const extensions = services.LanguageMetaData.fileExtensions;
    const { LangiumDocuments, LangiumDocumentFactory, DocumentBuilder } = services.shared.workspace;
    let documentUri: URI;
    let document: LangiumDocument<Document>;

    if ('filePath' in doc) {
        if (!extensions.includes(path.extname(doc.filePath))) {
            console.error(chalk.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
            process.exit(1);
        }

        if (!fs.existsSync(doc.filePath)) {
            console.error(chalk.red(`File ${doc.filePath} does not exist.`));
            process.exit(1);
        }

        documentUri = URI.file(path.resolve(doc.filePath));
        document = LangiumDocuments.getOrCreateDocument(documentUri) as LangiumDocument<Document>;
    } else {
        const randomNumber = Math.floor(Math.random() * 10000000) + 1000000;
        documentUri = URI.parse(`file:///${randomNumber}${extensions[0]}`);
        document = LangiumDocumentFactory.fromString(doc.text, documentUri);
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
