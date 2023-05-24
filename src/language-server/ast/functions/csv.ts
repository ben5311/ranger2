import * as csv from 'csv/sync';
import fs from 'fs';

import { resolvePath } from '../../../utils/documents';
import * as ast from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class CsvFuncCompanion extends FuncCompanion<ast.CsvFunc> {
    override valueGenerator(node: ast.CsvFunc): ValueGenerator {
        const filePath = resolvePath(node.filePath.value, node)!;
        const data = fs.readFileSync(filePath, 'utf-8');

        if (!node.delimiter) {
            const numCommas = data.match(/,/g)?.length;
            const numColons = data.match(/;/g)?.length;
            const delimiter = Number(numCommas) >= Number(numColons) ? ',' : ';';
            node.delimiter = delimiter;
        }

        const rows: any[] = csv.parse(data, { delimiter: node.delimiter, columns: !node.noHeader });

        return new ValueGenerator(() => {
            const randomIndex = this.generator.random.integer(0, rows.length - 1);
            return rows[randomIndex];
        });
    }

    override funcHover(node: ast.CsvFunc): FuncHover {
        const [filePath, delimiter, noHeader] = [node.filePath.value, node.delimiter, node.noHeader];
        const signature = `csv("${filePath}", delimiter="${delimiter}"${noHeader ? ', noHeader' : ''})`;

        return {
            signature,
            description: `Generates a random row of CSV file \`${filePath}\`.`,
        };
    }
}
