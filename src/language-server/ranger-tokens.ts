import { AbstractSemanticTokenProvider, AstNode, SemanticTokenAcceptor } from 'langium';

import { createCompanions } from './ast/registry';
import { generator } from './ranger-generator';

export class RangerTokenProvider extends AbstractSemanticTokenProvider {
    protected companions = createCompanions(generator);

    protected override highlightElement(node: AstNode, acceptor: SemanticTokenAcceptor) {
        this.companions.get(node)?.highlight(node, acceptor);
    }
}
