import { RandomNumber } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class RandomNumberCompanion extends FuncCompanion<RandomNumber> {
    override valueGenerator(random: RandomNumber): ValueGenerator | undefined {
        const [minVal, maxVal] = [random.min, random.max];
        if (!minVal || !maxVal) {
            return undefined; // can be undefined if there are parsing errors
        }

        const minScale = numRegex.exec(minVal.$cstNode?.text || '')?.[2]?.length || 0;
        const maxScale = numRegex.exec(maxVal.$cstNode?.text || '')?.[2]?.length || 0;
        const decimalPlaces = Math.max(minScale, maxScale);
        const [min, max] = [minVal.value, maxVal.value];

        let randomGenerator = decimalPlaces ? this.generator.random.real : this.generator.random.integer;
        randomGenerator = randomGenerator.bind(this.generator.random);

        return new ValueGenerator(() => {
            const randomNumber = randomGenerator(min, max);
            return Number(randomNumber.toFixed(decimalPlaces));
        });
    }

    override funcHover(random: RandomNumber): FuncHover {
        let [min, max] = [random.min.value, random.max.value];
        return {
            description: `Generates a random number between \`${min}\` and \`${max}\` (ends inclusive).`,
        };
    }
}

const numRegex = new RegExp(/[+-]?[0-9]+(\.([0-9]+))?/);
