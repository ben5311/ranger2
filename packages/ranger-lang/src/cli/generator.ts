import chalk from 'chalk';
import { Presets, SingleBar } from 'cli-progress';
import * as csv from 'csv-stringify';
import fs from 'fs';
import { NodeFileSystem } from 'langium/node';
import path from 'path';
import * as stream from 'stream';

import { DocumentSpec, parseDocument } from '../language-server/ranger-documents';
import { createRangerServices } from '../language-server/ranger-module';

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Object Generator for use when outside of the LSP server
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export type ObjectGenerator = { next(): any };
/**
 * Creates an ObjectGenerator that generates JavaScript objects based on a Ranger configuration file.
 */
export async function createObjectGenerator(docSpec: DocumentSpec): Promise<ObjectGenerator> {
    const services = createRangerServices(NodeFileSystem).Ranger;
    const document = await parseDocument({ services, docSpec });
    const generator = services.generator.Generator;
    const outputEntity = document.doc.entities.first();
    return {
        next: () => {
            const nextValue = generator.getValue(outputEntity) as object;
            generator.resetValues();
            return nextValue;
        },
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Ranger CLI Generator
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export type Options = {
    count: number;
    format: Format;
    outputDir: string;
};
export const formats = ['jsonl', 'csv'] as const;
export type Format = (typeof formats)[number];

/**
 * Generate JSONL or CSV test data file based on a Ranger configuration file.
 */
export async function generateOutputFile(docSpec: DocumentSpec, opts: Options): Promise<string> {
    const outputFileName = path.parse(docSpec.filePath).name;
    const outputFilePath = path.join(opts.outputDir, `${outputFileName}.${opts.format}`);

    const progressBarFormat = ' {bar} {percentage}% | T: {duration_formatted} | ETA: {eta_formatted} | {value}/{total}';
    const progressBar = new SingleBar({ format: progressBarFormat }, Presets.shades_classic);

    const generator = await createObjectStream(docSpec, opts.count);
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
                resolve(outputFilePath);
            }
        });
    });
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Streams: Readables / Transformers / Writables
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a Readable Stream that outputs objects generated from a Ranger configuration file.
 */
export async function createObjectStream(docSpec: DocumentSpec, count: number): Promise<stream.Readable> {
    const generator = await createObjectGenerator(docSpec);
    let i = 1;
    return new stream.Readable({
        objectMode: true,
        read(_size) {
            if (i++ <= count) {
                const next = generator.next();
                this.push(next);
            } else {
                this.push(null);
            }
        },
    });
}

/**
 * Creates a Transformer that transforms objects into CSV or JSON strings.
 */
export function Transformer(format: Format): stream.Transform {
    const transformers: { [key in Format]: () => stream.Transform } = {
        jsonl: createJsonlTransformer,
        csv: createCsvTransformer,
    };
    return transformers[format]();
}

/**
 * Creates a File Writer that writes strings to file.
 */
export function FileWriter(filePath: string): stream.Writable {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }
    return fs.createWriteStream(filePath, { flags: 'w', encoding: 'utf-8' });
}

function createJsonlTransformer(): stream.Transform {
    return new stream.Transform({
        objectMode: true,
        transform(chunk, _encoding, callback) {
            const json = JSON.stringify(chunk);
            this.push(json);
            this.push('\n');
            callback();
        },
    });
}

function createCsvTransformer(): stream.Transform {
    return csv.stringify({
        header: true,
        delimiter: ',',
        cast: {
            boolean: (bool, _) => bool.toString(),
        },
    });
}

/**
 * Create a Transform that passes through all chunks but notifies after each chunk has been processed.
 */
export function ProxyTransformer(notify: (chunk: object) => void): stream.Transform {
    return new stream.Transform({
        objectMode: true,
        transform(chunk, _encoding, callback) {
            this.push(chunk);
            notify(chunk);
            callback();
        },
    });
}
