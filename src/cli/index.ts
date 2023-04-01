import chalk from 'chalk';
import { Command } from 'commander';
import { NodeFileSystem } from 'langium/node';

import { Document } from '../language-server/generated/ast';
import { RangerLanguageMetaData } from '../language-server/generated/module';
import { createRangerServices } from '../language-server/ranger-module';
import { extractAstNode } from './cli-util';
import { generateJavaScript } from './generator';

export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createRangerServices(NodeFileSystem).Ranger;
    const document = await extractAstNode<Document>(fileName, services);
    const generatedFilePath = generateJavaScript(document, fileName, opts.destination);
    console.log(chalk.green(`JavaScript code generated successfully: ${generatedFilePath}`));
};

export type GenerateOptions = {
    destination?: string;
};

export default function (): void {
    const program = new Command();

    program
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .version(require('../../package.json').version);

    const fileExtensions = RangerLanguageMetaData.fileExtensions.join(', ');
    program
        .command('generate')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .description('generates JavaScript code that prints "Hello, {name}!" for each greeting in a source file')
        .action(generateAction);

    program.parse(process.argv);
}
