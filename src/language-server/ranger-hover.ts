import dedent from 'dedent-js';
import {
    AstNode,
    DocumentationProvider,
    findDeclarationNodeAtOffset,
    GrammarConfig,
    LangiumDocument,
    LangiumServices,
    MaybePromise,
    References,
} from 'langium';
import { Hover, HoverParams } from 'vscode-languageserver';

import * as ast from './generated/ast';
import { getValueAsJson } from './ranger-generator';
import { resolveReference } from './ranger-scope';

export class RangerHoverProvider {
    protected readonly references: References;
    protected readonly grammarConfig: GrammarConfig;
    protected readonly documentationProvider: DocumentationProvider;

    constructor(services: LangiumServices) {
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
        this.documentationProvider = services.documentation.DocumentationProvider;
    }

    public getHoverContent(document: LangiumDocument, params: HoverParams): MaybePromise<Hover | undefined> {
        const rootNode = document.parseResult?.value?.$cstNode;
        if (rootNode) {
            const offset = document.textDocument.offsetAt(params.position);
            const cstNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
            if (cstNode && cstNode.offset + cstNode.length > offset && cstNode.element) {
                let hover = this.getAstNodeHover(cstNode.element);
                if (hover !== undefined) {
                    return {
                        contents: {
                            kind: 'markdown',
                            value: hover,
                        },
                    };
                }
            }
        }
        return undefined;
    }

    /**
     * Returns Hover text for node.
     */
    public getAstNodeHover(node: AstNode, verbose = true): string | undefined {
        if (ast.isProperty(node)) {
            return `${node.name}: ${this.getAstNodeHover(node.value, false)}`;
        }
        if (ast.isPropertyReference(node)) {
            const resolved = resolveReference(node);
            return resolved !== undefined ? this.getAstNodeHover(resolved) : undefined;
        }
        if (ast.isLiteral(node)) {
            if (ast.isNull(node)) return 'null';
            let value = JSON.stringify(node.value);
            let type = ast.isPrimitive(node) ? typeof node.value : node.$type.toLowerCase();
            return verbose ? `${value} : ${type}` : value;
        }
        if (ast.isFunc(node)) {
            return this.getFuncHover(node, verbose);
        }
        if (ast.isValue(node)) {
            return getValueAsJson(node);
        }
        return undefined;
    }

    public getFuncHover(func: ast.Func, verbose = true): string | undefined {
        let signature = func.$cstNode?.text;
        let hover = signature;
        if (ast.isRandomOfRange(func)) {
            //
        } else if (ast.isRandomOfList(func)) {
            //
        } else if (ast.isMapToList(func)) {
            //
        } else if (ast.isMapToObject(func)) {
            //
        } else if (ast.isCsvFunc(func)) {
            const [filePath, delimiter, noHeader] = [func.source.filePath, func.delimiter, func.noHeader];
            signature = `csv("${filePath}", delimiter="${delimiter}"${noHeader ? ', noHeader' : ''})`;
            hover = dedent`
            # Signature

            \`\`\`ranger
            ${signature}
            \`\`\`

            ## Params

            * Param1
            * Param2
            `;
            return hover.replace('searchValue', ' replaceValue');
        }
        return verbose ? hover : signature;
    }
}
