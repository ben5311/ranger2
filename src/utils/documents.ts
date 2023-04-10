import chalk from 'chalk';
import fs from 'fs';
import { AstNode, LangiumDocument, LangiumServices } from 'langium';
import path from 'path';
import { URI } from 'vscode-uri';

/**
 * Parse and extract an AstNode from a Ranger document.
 */
export async function extractAstNode<T extends AstNode>(filePath: string, services: LangiumServices): Promise<T> {
    return (await extractDocument(filePath, services)).parseResult?.value as T;
}

/**
 * Parse a Ranger document.
 */
export async function extractDocument(filePath: string, services: LangiumServices): Promise<LangiumDocument> {
    const extensions = services.LanguageMetaData.fileExtensions;
    if (!extensions.includes(path.extname(filePath))) {
        console.error(chalk.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`File ${filePath} does not exist.`));
        process.exit(1);
    }

    const document = services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(filePath)));
    await services.shared.workspace.DocumentBuilder.build([document], { validationChecks: 'all' });

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

    return document;
}
