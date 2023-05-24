import * as ast from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class SequenceFuncCompanion extends FuncCompanion<ast.SequenceFunc> {
    override valueGenerator(node: ast.SequenceFunc): ValueGenerator {
        let number = node.start?.value || 1;
        return new ValueGenerator(() => number++);
    }

    override funcHover(node: ast.SequenceFunc): FuncHover {
        const start = node.start.value;
        return {
            description: `Generates number sequence \`${start}, ${start + 1}, ${start + 2}, ...\``,
        };
    }
}
