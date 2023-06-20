import { RandomOfList } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class RandomOfListCompanion extends FuncCompanion<RandomOfList> {
    override valueGenerator(randomFunc: RandomOfList): ValueGenerator {
        const choices = randomFunc.list.values;

        return new ValueGenerator((data) => {
            const randomIndex = this.generator.random.integer(0, choices.length - 1);
            data.index = randomIndex;
            return this.generator.getValue(choices[randomIndex]);
        });
    }

    override funcHover(randomFunc: RandomOfList): FuncHover {
        const choices = randomFunc.list.values.map((v) => v.$cstNode?.text).join(', ');
        return {
            description: `Generates a random value of \`[${choices}]\`.`,
        };
    }
}
