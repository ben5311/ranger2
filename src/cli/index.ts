import chalk from 'chalk';
import { Presets, SingleBar } from 'cli-progress';
import { Command, Option } from 'commander';
import fs from 'fs';
import { NodeFileSystem } from 'langium/node';
import path from 'path';

import { Document } from '../language-server/generated/ast';
import { RangerLanguageMetaData } from '../language-server/generated/module';
import { getValue, resetValues } from '../language-server/ranger-generator';
import { createRangerServices } from '../language-server/ranger-module';
import { extractAstNode, parseIntg } from './cli-util';

export default function (): void {
    const program = new Command();
    const fileExtensions = RangerLanguageMetaData.fileExtensions.join(', ');
    program
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .version(require('../../package.json').version)
        .description('Generate test data from Ranger configuration file.')
        .argument('<rangerFile>', `Source file (possible file extensions: ${fileExtensions})`)
        .addOption(new Option('-c --count <count>', 'The count of rows to generate').default('20').argParser(parseIntg))
        .addOption(new Option('-f, --format <format>', 'The output format').choices(['jsonl', 'csv']).default('jsonl'))
        .addOption(new Option('-o, --outputDir <dir>', 'The desired output directory').default('generated'))
        .action(generateAction);
    program.parse(process.argv);
}

export type Options = {
    count: number;
    format: 'jsonl' | 'csv';
    outputDir: string;
};

// generateAction('examples/User.ranger', { count: 20, format: 'jsonl', outputDir: 'generated' });

async function generateAction(filePath: string, opts: Options): Promise<void> {
    const services = createRangerServices(NodeFileSystem).Ranger;
    const document = await extractAstNode<Document>(filePath, services);
    const generatedFilePath = generateOutputFile(document, filePath, opts);
    console.log(chalk.green(`Output file generated successfully: ${generatedFilePath}`));
}

export function generateOutputFile(document: Document, filePath: string, opts: Options): string {
    const outputFileName = path.basename(filePath, path.extname(filePath));
    const outputFilePath = path.join(opts.outputDir, `${outputFileName}.${opts.format}`);
    const outputFile = fs.createWriteStream(outputFilePath, { flags: 'w', encoding: 'utf-8' });
    const entity = document.entities[0];

    if (!fs.existsSync(opts.outputDir)) fs.mkdirSync(opts.outputDir, { recursive: true });
    const progressBarFormat = ' {bar} {percentage}% | T: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}';
    const progressBar = new SingleBar({ format: progressBarFormat }, Presets.shades_classic);
    progressBar.start(opts.count, 0);
    for (let i = 1; i <= opts.count; i++) {
        const value = getValue(entity);
        outputFile.write(JSON.stringify(value));
        outputFile.write('\n');
        progressBar.increment();
        resetValues();
    }
    outputFile.close();
    progressBar.stop();

    return outputFilePath;
}
