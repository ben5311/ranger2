import { AbstractSemanticTokenProvider, AstNode, SemanticTokenAcceptor } from 'langium';

import { executeProvider, Providers } from './ranger-ast';

export class RangerTokenProvider extends AbstractSemanticTokenProvider {
    protected override highlightElement(node: AstNode, highlight: SemanticTokenAcceptor): void | 'prune' | undefined {
        const providers: Providers = {
            AString: () => highlight({ node, property: 'value', type: 'string' }),
            ABool: () => highlight({ node, property: 'value', type: 'keyword' }),
            ANumber: () => highlight({ node, property: 'value', type: 'number' }),
            ADate: () => highlight({ node, property: 'value', type: 'string' }),
            ATimestamp: () => highlight({ node, property: 'value', type: 'string' }),
            ANull: () => highlight({ node, keyword: 'null', type: 'keyword' }),
            Entity: () => highlight({ node, keyword: 'Entity', type: 'keyword' }),
            Property: () => highlight({ node, property: 'name', type: 'property' }),
            Func: () => {
                const match = node.$cstNode?.text?.match(/([\w_]+)\(/);
                if (match) highlight({ node, keyword: match[1], type: 'keyword' });
            },
        };
        executeProvider(providers, node);
    }
}
