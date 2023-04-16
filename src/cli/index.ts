import chalk from 'chalk';
import { Presets, SingleBar } from 'cli-progress';
import { Command, Option } from 'commander';
import path from 'path';
import stream from 'stream';

import { RangerLanguageMetaData } from '../language-server/generated/module';
import { FileWriter, ObjectGenerator, ProxyTransformer, Transformer } from './generator';

export type Options = {
    count: number;
    format: Format;
    outputDir: string;
};
const formats = ['jsonl', 'csv'] as const;
export type Format = typeof formats[number];

export function run(): void {
    const program = new Command();
    const fileExtensions = RangerLanguageMetaData.fileExtensions.join(', ');

    program
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .version(require('../../package.json').version)
        .description('Generate test data from Ranger configuration file.')
        .argument('<rangerFile>', `Source file (possible file extensions: ${fileExtensions})`)
        .addOption(new Option('-c --count <count>', 'The count of rows to generate').default('10').argParser(parseIntg))
        .addOption(new Option('-f, --format <format>', 'The output format').choices(formats).default('jsonl'))
        .addOption(new Option('-o, --outputDir <dir>', 'The desired output directory').default('generated'))
        .action(async (rangerFile: string, opts: Options) => {
            try {
                await generateOutputFile({ filePath: rangerFile }, opts);
            } catch (error) {
                console.log(chalk.red(error));
                process.exit(1);
            }
        });

    program.parse(process.argv);
}

function parseIntg(text: string): number {
    const parsedNumber = parseInt(text);
    if (isNaN(parsedNumber)) {
        console.log(chalk.red(`Not a valid integer: ${text}`));
        process.exit(1);
    }
    return parsedNumber;
}

export type DocumentSpec = { filePath: string } | { text: string; fileName: string };
/**
 * Generate test data based on a Ranger configuration file.
 *
 * Provide either the path to the Ranger file or its content and the desired output file name.
 */
export async function generateOutputFile(docSpec: DocumentSpec, opts: Options): Promise<void> {
    const outputFileName = path.parse('fileName' in docSpec ? docSpec.fileName : docSpec.filePath).name;
    const outputFilePath = path.join(opts.outputDir, `${outputFileName}.${opts.format}`);

    const progressBarFormat = ' {bar} {percentage}% | T: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}';
    const progressBar = new SingleBar({ format: progressBarFormat }, Presets.shades_classic);

    const generator = await ObjectGenerator(docSpec, opts.count);
    const reporter = ProxyTransformer(() => progressBar.increment());
    const transformer = Transformer(opts.format);
    const writer = FileWriter(outputFilePath);

    progressBar.start(opts.count, 0);

    return new Promise((resolve, reject) => {
        stream.pipeline(generator, reporter, transformer, writer, (error) => {
            progressBar.stop();
            if (error) {
                console.error(chalk.red(`Error generating [${outputFilePath}]: ${error}`));
                reject(error);
            } else {
                console.log(chalk.green(`Output file generated successfully: ${outputFilePath}`));
                resolve();
            }
        });
    });
}

// generateOutputFile('examples/User.ranger', { count: 20, format: 'jsonl', outputDir: 'generated' }); // For Debugging
// run()
