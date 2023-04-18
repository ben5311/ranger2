import * as csv from 'csv-stringify';
import fs from 'fs';
import { NodeFileSystem } from 'langium/node';
import path from 'path';
import * as stream from 'stream';

import { Generator } from '../language-server/ranger-generator';
import { createRangerServices } from '../language-server/ranger-module';
import { DocumentSpec, parseDocument } from '../utils/documents';
import { Format } from './';

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Object Generator for use when outside of the LSP server
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

type ObjectGenerator = { next(): any };
/**
 * Creates an ObjectGenerator that generates JavaScript objects based on a Ranger configuration file.
 *
 * @param filePath Path to the .ranger file.
 */
export async function createObjectGenerator(docSpec: DocumentSpec): Promise<ObjectGenerator> {
    const services = createRangerServices(NodeFileSystem).Ranger;
    const { parseResult } = await parseDocument(services, docSpec);
    const outputEntity = parseResult.entities[0]; // Pick the first entity of the document
    const generator = new Generator();
    return {
        next: () => {
            const nextValue = generator.getValue(outputEntity) as object;
            generator.resetValues();
            return nextValue;
        },
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Streams: Readables / Transformers / Writables
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a ReadableStream that outputs objects generated from a Ranger configuration file.
 */
export async function ObjectGenerator(docSpec: DocumentSpec, count: number): Promise<stream.Readable> {
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

export async function closeWriter(...writers: stream.Writable[]): Promise<void> {
    const promises: Promise<void>[] = [];
    writers.forEach((writer) =>
        promises.push(
            new Promise((resolve, _reject) => {
                writer.end();
                writer.on('finish', () => resolve());
            }),
        ),
    );
    await Promise.all(promises);
}
