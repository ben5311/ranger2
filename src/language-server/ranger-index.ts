import {
    AstNode,
    AstNodeDescription,
    AstNodeLocator,
    DefaultDocumentBuilder,
    DocumentBuilder,
    IndexManager,
    LangiumDocuments,
    LangiumSharedServices,
    ScopeComputation,
} from 'langium';

import { RangerType } from './ranger-ast';
import { generator } from './ranger-generator';
import { RangerServices } from './ranger-module';

export class IndexAccess {
    protected readonly documentBuilder: DocumentBuilder;
    protected readonly documents: LangiumDocuments;
    protected readonly indexManager: IndexManager;
    protected readonly astNodeLocator: AstNodeLocator;
    protected readonly scopeComputation: ScopeComputation;

    constructor(protected services: RangerServices) {
        this.documentBuilder = services.shared.workspace.DocumentBuilder;
        this.documents = services.shared.workspace.LangiumDocuments;
        this.indexManager = services.shared.workspace.IndexManager;
        this.astNodeLocator = services.workspace.AstNodeLocator;
        this.scopeComputation = services.references.ScopeComputation;
    }

    /**
     * Find all elements available in the global scope matching the given type and name.
     * @param fromNode The node from where you are looking for other nodes.
     * @param type The requested node type.
     * @param name The requested node name.
     * @returns Found AstNodes.
     */
    searchIndex(type: RangerType, name?: string): AstNodeDescription[] {
        return this.indexManager
            .allElements(type)
            .map((desc) => {
                return { ...desc, node: this.loadAstNode(desc) };
            })
            .filter((desc) => name === undefined || desc.name === name)
            .toArray();
    }

    loadAstNode(nodeDescription: AstNodeDescription): AstNode | undefined {
        if (nodeDescription.node) {
            return nodeDescription.node;
        }
        const doc = this.documents.getOrCreateDocument(nodeDescription.documentUri);
        return this.astNodeLocator.getAstNode(doc.parseResult.value, nodeDescription.path);
    }
}

export class RangerDocumentBuilder extends DefaultDocumentBuilder {
    constructor(services: LangiumSharedServices) {
        super(services);
        this.onUpdate((_changed, _deleted) => generator.clearValues());
    }

    invalidateAllDocuments() {
        const documentUris = this.langiumDocuments.all.map((doc) => doc.uri).toArray();
        this.update(documentUris, []);
    }
}
