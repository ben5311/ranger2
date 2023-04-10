import chalk from 'chalk';
import fs from 'fs';
import { LangiumDocument, LangiumServices } from 'langium';
import { NodeFileSystem } from 'langium/node';
import path from 'path';
import { URI } from 'vscode-uri';

import { Document } from '../language-server/generated/ast';
import { getValue, resetValues } from '../language-server/ranger-generator';
import { createRangerServices } from '../language-server/ranger-module';

export interface ObjectGenerator {
    next: () => object;
}

/**
 * Creates an ObjectGenerator that generates JavaScript objects based on a Ranger configuration file.
 *
 * @param filePath Path to the .ranger file.
 */
export async function createObjectGenerator(filePath: string): Promise<ObjectGenerator> {
    const services = createRangerServices(NodeFileSystem).Ranger;
    const document = (await extractDocument(filePath, services)).parseResult.value as Document;
    const outputEntity = document.entities[0]; // Pick the first entity of the document
    return {
        next: () => {
            const nextValue = getValue(outputEntity) as object;
            resetValues();
            return nextValue;
        },
    };
}

export async function extractDocument(fileName: string, services: LangiumServices): Promise<LangiumDocument> {
    const extensions = services.LanguageMetaData.fileExtensions;
    if (!extensions.includes(path.extname(fileName))) {
        console.error(chalk.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
        process.exit(1);
    }

    if (!fs.existsSync(fileName)) {
        console.error(chalk.red(`File ${fileName} does not exist.`));
        process.exit(1);
    }

    const document = services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(fileName)));
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

export function parseIntg(text: string): number {
    const parsedNumber = parseInt(text);
    if (isNaN(parsedNumber)) {
        console.log(chalk.red(`Not a valid integer: ${text}`));
        process.exit(1);
    }
    return parsedNumber;
}
