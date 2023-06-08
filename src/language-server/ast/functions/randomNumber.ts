import dedent from 'dedent-js';

import { RandomNormal, RandomNumber } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class RandomNumberCompanion extends FuncCompanion<RandomNumber> {
    override valueGenerator(random: RandomNumber): ValueGenerator | undefined {
        const [min, max] = [random.min, random.max];
        const [minVal, maxVal] = [min.value, max.value];
        const decimals = decimalPlaces(min.$cstNode?.text, max.$cstNode?.text);

        let randomGenerator = decimals ? this.generator.random.real : this.generator.random.integer;
        randomGenerator = randomGenerator.bind(this.generator.random);

        return new ValueGenerator(() => {
            const randomNumber = randomGenerator(minVal, maxVal);
            return truncateDecimals(randomNumber, decimals);
        });
    }

    override funcHover(random: RandomNumber): FuncHover {
        let [min, max] = [random.min.value, random.max.value];
        return {
            description: `Generates a random number between \`${min}\` and \`${max}\` (ends inclusive).`,
        };
    }
}

export class RandomNormalCompanion extends FuncCompanion<RandomNormal> {
    override valueGenerator(normal: RandomNormal): ValueGenerator {
        const [mean, std] = [normal.mean, normal.std];
        const [meanVal, stdVal] = [mean.value, std.value];
        const decimals = decimalPlaces(mean.$cstNode?.text, std.$cstNode?.text);

        const randomGenerator = this.generator.random.realZeroToOneExclusive.bind(this.generator.random);

        return new ValueGenerator(() => {
            const randomNumber = gaussianRandom(meanVal, stdVal, randomGenerator);
            return truncateDecimals(randomNumber, decimals);
        });
    }

    override funcHover(_normal: RandomNormal): FuncHover {
        return {
            description: dedent`
            Generates random values based on a [Normal distribution](https://en.wikipedia.org/wiki/Normal_distribution).

            #### Parameters
            * mean: The mean of the Normal distribution.
            * std: The standard deviation of the Normal distribution.
            `,
        };
    }
}

const numRegex = new RegExp(/[+-]?[0-9]+(\.([0-9]+))?/);

/**
 * Returns the maximum number of decimal places among multiple numbers.
 */
function decimalPlaces(...numbers: any[]): number {
    let result = 0;
    numbers = numbers.filter((num) => num !== undefined);

    for (let number of numbers) {
        const decimals = numRegex.exec(String(number))?.[2]?.length || 0;
        if (decimals > result) {
            result = decimals;
        }
    }

    return result;
}

function truncateDecimals(number: number, decimalPlaces = 0): number {
    return Number(number.toFixed(decimalPlaces));
}

/**
 * Generates random number using Standard Normal variate with the Box-Muller transform.
 * @see https://stackoverflow.com/a/36481059/6316545
 *
 * @param mean Mean.
 * @param stdev Standard deviation.
 * @param rng Generator for random numbers from interval [0, 1)
 */
function gaussianRandom(mean = 0, stdev = 1, rng = Math.random): number {
    const u = 1 - rng(); // Converting [0,1) to (0,1]
    const v = rng();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}
