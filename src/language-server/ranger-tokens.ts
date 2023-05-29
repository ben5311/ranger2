import { AbstractSemanticTokenProvider, AstNode, SemanticTokenAcceptor } from 'langium';

import { RangerCompanions } from './ranger-companions';
import { RangerServices } from './ranger-module';

export class RangerTokenProvider extends AbstractSemanticTokenProvider {
    companions: RangerCompanions;

    constructor(protected services: RangerServices) {
        super(services);
        this.companions = services.generator.Companions;
    }

    protected override highlightElement(node: AstNode, acceptor: SemanticTokenAcceptor) {
        this.companions.get(node).highlight(node, acceptor);
    }
}
