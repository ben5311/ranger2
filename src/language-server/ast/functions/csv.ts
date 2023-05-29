import * as csv from 'csv/sync';
import fs from 'fs';
import { ValidationAcceptor } from 'langium';

import { CsvFunc } from '../../generated/ast';
import { resolvePath } from '../../ranger-documents';
import { Issues } from '../../ranger-validator';
import { Check } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class CsvFuncCompanion extends FuncCompanion<CsvFunc> {
    override valueGenerator(csvFunc: CsvFunc): ValueGenerator {
        const filePath = resolvePath(csvFunc.filePath.value, csvFunc);
        const data = fs.readFileSync(filePath, 'utf-8');

        if (!csvFunc.delimiter) {
            const numCommas = data.match(/,/g)?.length;
            const numColons = data.match(/;/g)?.length;
            const delimiter = Number(numCommas) >= Number(numColons) ? ',' : ';';
            csvFunc.delimiter = delimiter;
        }

        const rows: any[] = csv.parse(data, { delimiter: csvFunc.delimiter, columns: !csvFunc.noHeader });

        return new ValueGenerator(() => {
            const randomIndex = this.generator.random.integer(0, rows.length - 1);
            return rows[randomIndex];
        });
    }

    override funcHover(csvFunc: CsvFunc): FuncHover {
        const [filePath, delimiter, noHeader] = [csvFunc.filePath.value, csvFunc.delimiter, csvFunc.noHeader];
        const signature = `csv("${filePath}", delimiter="${delimiter}"${noHeader ? ', noHeader' : ''})`;

        return {
            signature,
            description: `Generates a random row of CSV file \`${filePath}\`.`,
        };
    }

    @Check
    invalidCsvFile(csvFunc: CsvFunc, accept: ValidationAcceptor) {
        const issue = Issues.InvalidCsvFile;
        const filePath = resolvePath(csvFunc.filePath.value, csvFunc);
        if (!fs.existsSync(filePath)) return;
        try {
            this.generator.getValue(csvFunc);
        } catch (error) {
            accept('error', `${error}\n\nCheck delimiter!`, { node: csvFunc, property: 'filePath', code: issue.code });
        }
    }
}
