import * as csv from 'csv-stringify';
import fs from 'fs';
import { NodeFileSystem } from 'langium/node';
import path from 'path';
import * as stream from 'stream';

import { getValue, resetValues } from '../language-server/ranger-generator';
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
export async function createObjectGenerator(doc: DocumentSpec): Promise<ObjectGenerator> {
    const services = createRangerServices(NodeFileSystem).Ranger;
    const { parseResult } = await parseDocument(services, doc);
    const outputEntity = parseResult.entities[0]; // Pick the first entity of the document
    return {
        next: () => {
            const nextValue = getValue(outputEntity) as object;
            resetValues();
            return nextValue;
        },
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// File writers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function createWriter(filePath: string, format: Format) {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }
    const transformer = transformers[format]();
    const outputStream = fs.createWriteStream(filePath, { flags: 'w', encoding: 'utf-8' });
    transformer.pipe(outputStream);
    return {
        write: (obj: object) => transformer.write(obj),
        close: () => closeWriter(transformer, outputStream),
    };
}

const transformers: { [key in Format]: () => stream.Transform } = {
    jsonl: createJsonlTransformer,
    csv: createCsvTransformer,
};

function createJsonlTransformer(): stream.Transform {
    return new stream.Transform({
        objectMode: true,
        transform(chunk, _encoding, callback) {
            this.push(JSON.stringify(chunk));
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
