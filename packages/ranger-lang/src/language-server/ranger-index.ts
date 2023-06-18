import { AstNode, AstNodeDescription, AstNodeLocator, IndexManager, LangiumDocuments } from 'langium';

import { RangerType } from './ast/Providers';
import { RangerServices } from './ranger-module';

export class IndexAccess {
    protected readonly documents: LangiumDocuments;
    protected readonly indexManager: IndexManager;
    protected readonly astNodeLocator: AstNodeLocator;

    constructor(protected services: RangerServices) {
        this.documents = services.shared.workspace.LangiumDocuments;
        this.indexManager = services.shared.workspace.IndexManager;
        this.astNodeLocator = services.workspace.AstNodeLocator;
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

    loadAstNode(nodeDescription?: AstNodeDescription): AstNode | undefined {
        if (!nodeDescription) {
            return undefined;
        }
        if (nodeDescription.node) {
            return nodeDescription.node;
        }
        const doc = this.documents.getOrCreateDocument(nodeDescription.documentUri);
        return this.astNodeLocator.getAstNode(doc.parseResult.value, nodeDescription.path);
    }
}
