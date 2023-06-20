import dedent from 'dedent-js';
import { ValidationAcceptor } from 'langium';

import { ANumber, RandomNormal, RandomNumber } from '../../generated/ast';
import { Issues } from '../../ranger-validator';
import { Check } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class RandomNumberCompanion extends FuncCompanion<RandomNumber> {
    override valueGenerator(random: RandomNumber): ValueGenerator | undefined {
        const { min, max, decimalPlaces } = this.getValues(random);

        let randomGenerator = decimalPlaces ? this.generator.random.real : this.generator.random.integer;
        randomGenerator = randomGenerator.bind(this.generator.random);

        return new ValueGenerator(() => {
            const randomNumber = randomGenerator(min, max);
            return truncateDecimals(randomNumber, decimalPlaces);
        });
    }

    override funcHover(random: RandomNumber): FuncHover {
        const { min, max } = this.getValues(random);
        return {
            description: `Generates a random number between \`${min}\` and \`${max}\` (ends inclusive).`,
        };
    }

    getValues(random: RandomNumber) {
        return {
            min: random.min.value,
            max: random.max.value,
            decimalPlaces: decimalPlaces(random.min, random.max),
        };
    }
}

export class RandomNormalCompanion extends FuncCompanion<RandomNormal> {
    override valueGenerator(normal: RandomNormal): ValueGenerator {
        const { min, max, mean, std, decimalPlaces } = this.getValues(normal);

        const randomGenerator = () => this.generator.random.realZeroToOneExclusive();

        return new ValueGenerator(() => {
            let randomNumber: number;

            let i = 1;
            do {
                randomNumber = gaussianRandom(mean, std, randomGenerator);
                // Skip generated numbers that are not inside [min..max] interval
            } while ((randomNumber < min || randomNumber > max) && i++ < 1000);

            if (randomNumber < min || randomNumber > max) {
                // If no suitable number was found, fallback to min value
                randomNumber = min;
            }

            return truncateDecimals(randomNumber, decimalPlaces);
        });
    }

    override funcHover(normal: RandomNormal): FuncHover {
        const { min, max } = this.getValues(normal);
        return {
            description: dedent`
            Generates a random number between \`${min}\` and \`${max}\` (ends inclusive) based on a
            [Normal distribution](https://en.wikipedia.org/wiki/Normal_distribution).

            #### Parameters
            * mean: The mean of the Normal distribution.
            * std: The standard deviation of the Normal distribution.
            `,
        };
    }

    getValues(normal: RandomNormal) {
        return {
            min: normal.min.value,
            max: normal.max.value,
            mean: normal.mean.value,
            std: normal.std.value,
            decimalPlaces: decimalPlaces(normal.min, normal.max, normal.mean, normal.std),
        };
    }

    @Check
    meanIsInRange(normal: RandomNormal, accept: ValidationAcceptor) {
        const issue = Issues.MeanOutOfBounds;
        const { min, max, mean } = this.getValues(normal);

        if (mean < min || mean > max) {
            accept('error', `${issue.msg} [${min}..${max}]`, {
                node: normal,
                property: 'mean',
                code: issue.code,
            });
        }
    }
}

const numRegex = new RegExp(/[+-]?[0-9]+(\.([0-9]+))?/);

/**
 * Returns the maximum number of decimal places among multiple numbers.
 */
function decimalPlaces(...numbers: ANumber[]): number {
    let result = 0;

    for (let number of numbers) {
        const numberText = number.$cstNode?.text || '';
        const decimals = numRegex.exec(numberText)?.[2]?.length || 0;
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
 * @param rng Generator for random numbers from interval [0, 1).
 */
function gaussianRandom(mean = 0, stdev = 1, rng = Math.random): number {
    const u = 1 - rng(); // Converting [0,1) to (0,1]
    const v = rng();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}
