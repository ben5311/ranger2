import chalk from 'chalk';
import { Command, Option } from 'commander';

import { RangerLanguageMetaData } from '../language-server/generated/module';
import { formats, generateOutputFile, Options } from './generator';

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
            generateOutputFile({ filePath: rangerFile }, opts).catch((error) => {
                console.log(chalk.red(error.message || error));
                process.exit(1);
            });
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

if (require.main === module) {
    run();
}
