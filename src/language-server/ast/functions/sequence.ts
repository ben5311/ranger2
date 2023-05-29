import { SequenceFunc } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class SequenceFuncCompanion extends FuncCompanion<SequenceFunc> {
    override valueGenerator(sequence: SequenceFunc): ValueGenerator {
        let number = sequence.start?.value || 1;
        return new ValueGenerator(() => number++);
    }

    override funcHover(sequence: SequenceFunc): FuncHover {
        const start = sequence.start.value;
        return {
            description: `Generates number sequence \`${start}, ${start + 1}, ${start + 2}, ...\``,
        };
    }
}
