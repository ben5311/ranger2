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
        .action(generateOutputFile);

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

export async function generateOutputFile(filePath: string, opts: Options): Promise<void> {
    const outputFileName = `${path.parse(filePath).name}.${opts.format}`;
    const outputFilePath = path.join(opts.outputDir, outputFileName);

    const progressBarFormat = ' {bar} {percentage}% | T: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}';
    const progressBar = new SingleBar({ format: progressBarFormat }, Presets.shades_classic);
    progressBar.start(opts.count, 0);

    const generator = await ObjectGenerator({ filePath }, opts.count);
    const proxy = ProxyTransformer(() => progressBar.increment());
    const transformer = Transformer(opts.format);
    const writer = FileWriter(outputFilePath);

    return new Promise((resolve, reject) => {
        stream.pipeline(generator, proxy, transformer, writer, (error) => {
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

//generateOutputFile('examples/User.ranger', { count: 20, format: 'jsonl', outputDir: 'generated' }); // For Debugging

if (require.main === module) {
    run();
}
