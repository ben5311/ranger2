import dedent from 'dedent-js';

import { WeightedFunc } from '../../generated/ast';
import { ValueGenerator } from '../ValueGenerator';
import { FuncCompanion, FuncHover } from './func';

export class WeightedFuncCompanion extends FuncCompanion<WeightedFunc> {
    override valueGenerator(weighted: WeightedFunc): ValueGenerator {
        const choices = weighted.values;
        const weights = weighted.weights.map((w) => w.value);
        const randomNumberGenerator = () => this.generator.random.realZeroToOneExclusive();
        const valueGenerator = weightedRandom(choices, weights, randomNumberGenerator);

        return new ValueGenerator(() => {
            const randomValue = valueGenerator();
            return this.generator.getValue(randomValue);
        });
    }

    override funcHover(weighted: WeightedFunc): FuncHover {
        const choices = weighted.values.map((v) => v.$cstNode?.text).join(', ');
        let description = `Generates a weighted random value of \`[${choices}]\`.`;

        const firstChoice = weighted.values.first();
        const firstWeight = weighted.weights.first()?.value;
        const totalWeight = weighted.weights.map((w) => w.value).sum();

        if (firstChoice && firstWeight) {
            description += dedent`
            \n
            For example, with a probablity of \`${percentage(firstWeight / totalWeight)}\`,
            \`${firstChoice.$cstNode?.text}\` is returned.`;
        }

        return { description };
    }
}

/**
 * Returns function that generates weighted random values.
 * @see https://stackoverflow.com/a/55671924/6316545
 *
 * @param items Values to choose from.
 * @param weights The weights.
 * @param rng Generator for random numbers from interval [0, 1).
 */
function weightedRandom<T>(items: T[], weights: number[], rng = Math.random): () => T {
    let i: number;
    weights = [...weights];

    for (i = 1; i < weights.length; i++) {
        weights[i] += weights[i - 1];
    }

    return function () {
        let randomNumber = rng() * weights[weights.length - 1];

        for (i = 0; i < weights.length; i++) {
            if (weights[i] > randomNumber) {
                break;
            }
        }

        return items[i];
    };
}

function percentage(number: number) {
    return (number * 100).toFixed(0) + '%';
}
