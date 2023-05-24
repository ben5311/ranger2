import { DynamicObject } from '../../../utils/types';
import * as ast from '../../generated/ast';
import { CodeHighlighter } from '../CodeHighlighter';
import { TypeCompanion } from '../TypeCompanion';
import { ValueGenerator } from '../ValueGenerator';

export class ObjektCompanion extends TypeCompanion<ast.Objekt> {
    override valueGenerator(node: ast.Objekt): ValueGenerator {
        return new ValueGenerator(() => {
            let result: DynamicObject = {};
            for (let prop of node.properties) {
                result[prop.name] = this.generator.getValue(prop.value);
            }
            return result;
        });
    }

    override hover(node: ast.Objekt, highlight: CodeHighlighter): string | undefined {
        return highlight(this.generator.getValueAsJson(node));
    }

    override highlight(): void {
        return;
    }
}
