import chalk from 'chalk';
import { Presets, SingleBar } from 'cli-progress';
import { Command, Option } from 'commander';
import path from 'path';

import { RangerLanguageMetaData } from '../language-server/generated/module';
import { createObjectGenerator, createWriter } from './generator';

export type Options = {
    count: number;
    format: Format;
    outputDir: string;
};
const formats = ['jsonl', 'csv'] as const;
export type Format = typeof formats[number];

export default function (): void {
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

//generateOutputFile('examples/User.ranger', { count: 20, format: 'jsonl', outputDir: 'generated' });

export async function generateOutputFile(filePath: string, opts: Options): Promise<void> {
    const generator = await createObjectGenerator(filePath);
    const outputFileName = path.basename(filePath, path.extname(filePath));
    const outputFilePath = path.join(opts.outputDir, `${outputFileName}.${opts.format}`);
    const outputWriter = createWriter(outputFilePath, opts.format);

    const progressBarFormat = ' {bar} {percentage}% | T: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}';
    const progressBar = new SingleBar({ format: progressBarFormat }, Presets.shades_classic);
    progressBar.start(opts.count, 0);

    for (let i = 1; i <= opts.count; i++) {
        const generated = generator.next();
        outputWriter.write(generated);
        progressBar.increment();
    }

    outputWriter.end();
    progressBar.stop();
    console.log(chalk.green(`Output file generated successfully: ${outputFilePath}`));
}
