import * as ast from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class RandomOfListCompanion extends FuncCompanion<ast.RandomOfList> {
    override valueGenerator(node: ast.RandomOfList): ValueGenerator {
        const list = node.list.values;

        return new ValueGenerator((data) => {
            const randomIndex = this.generator.random.integer(0, list.length - 1);
            data.index = randomIndex;
            return this.generator.getValue(list[randomIndex]);
        });
    }

    override funcHover(_node: ast.RandomOfList): FuncHover {
        return {
            description: `Generates a random element of the provided arguments.`,
        };
    }
}
