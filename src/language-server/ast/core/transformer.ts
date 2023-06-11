import dedent from 'dedent-js';
import { SemanticTokenAcceptor } from 'langium';

import { Transformer, TransformerType } from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class TransformerCompanion extends Companion<Transformer> {
    override valueGenerator(transformer: Transformer): ValueGenerator {
        const transformers: TransformerType[] = [transformer.type];

        while (transformer.previous) {
            transformer = transformer.previous;
            transformers.push(transformer.type);
        }

        transformers.reverse();

        return new ValueGenerator(() => {
            let value = this.generator.getValue(transformer.value);

            for (let transformer of transformers) {
                value = applyTransformer(value, transformer);
            }

            return value;
        });
    }

    override hover(transformer: Transformer, highlight: CodeHighlighter): string | undefined {
        return dedent`
        ${highlight(transformer.$cstNode?.text)}

        ${highlight(this.generator.getValueAsJson(transformer))}`;
    }

    override highlight(transformer: Transformer, highlight: SemanticTokenAcceptor): void {
        highlight({ node: transformer, property: 'type', type: 'keyword' });
    }
}

function applyTransformer(value: any, transformer: TransformerType): unknown {
    switch (transformer) {
        case 'ascii':
            return String(value)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
        case 'lower':
            return String(value).toLocaleLowerCase();
        case 'upper':
            return String(value).toLocaleUpperCase();
    }
}
