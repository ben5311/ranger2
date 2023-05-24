import * as ast from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { TypeCompanion } from '../TypeCompanion';
import { ValueGenerator } from '../ValueGenerator';

export class PropertyExtractorCompanion extends TypeCompanion<ast.PropertyExtractor> {
    override valueGenerator(node: ast.PropertyExtractor): ValueGenerator {
        return new ValueGenerator(() => {
            const source: any = this.generator.getValue(node.source);
            if (source) {
                return source[node.name];
            }
        });
    }

    override hover(node: ast.PropertyExtractor, highlight: CodeHighlighter): string | undefined {
        let valueText = this.generator.getValueAsJson(node);
        return highlight(`${node.name}: ${valueText}`);
    }

    override highlight(): void {
        return;
    }
}
