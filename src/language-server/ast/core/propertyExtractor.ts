import { PropertyExtractor } from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { Companion } from '../Companion';
import { ValueGenerator } from '../ValueGenerator';

export class PropertyExtractorCompanion extends Companion<PropertyExtractor> {
    override valueGenerator(extractor: PropertyExtractor): ValueGenerator {
        return new ValueGenerator(() => {
            const source: any = this.generator.getValue(extractor.source);
            if (source) {
                return source[extractor.name];
            }
        });
    }

    override hover(extractor: PropertyExtractor, highlight: CodeHighlighter): string | undefined {
        let valueText = this.generator.getValueAsJson(extractor);
        return highlight(`${extractor.name}: ${valueText}`);
    }

    override highlight(): void {
        return;
    }
}
