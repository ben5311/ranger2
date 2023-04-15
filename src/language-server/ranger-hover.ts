import dedent from 'dedent-js';
import {
    AstNode,
    DocumentationProvider,
    findDeclarationNodeAtOffset,
    GrammarConfig,
    HoverProvider,
    LangiumDocument,
    LangiumServices,
    MaybePromise,
    References,
} from 'langium';
import { Hover, HoverParams } from 'vscode-languageserver';

import * as ast from './generated/ast';
import { resolveReference } from './ranger-scope';

type CodeHighlighter = (text?: string, language?: string) => string | undefined;
type HoverComputation<T extends AstNode, ReturnType> = (node: T, highlight?: CodeHighlighter) => ReturnType;
type HoverProviders<R> = { [K in keyof ast.RangerAstType]?: HoverComputation<ast.RangerAstType[K], R> };

export class RangerHoverProvider implements HoverProvider {
    protected readonly references: References;
    protected readonly grammarConfig: GrammarConfig;
    protected readonly documentationProvider: DocumentationProvider;

    constructor(services: LangiumServices) {
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
        this.documentationProvider = services.documentation.DocumentationProvider;
    }

    getHoverContent(document: LangiumDocument, params: HoverParams): MaybePromise<Hover | undefined> {
        const rootNode = document.parseResult?.value?.$cstNode;
        if (rootNode) {
            const offset = document.textDocument.offsetAt(params.position);
            const cstNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
            if (cstNode && cstNode.offset + cstNode.length > offset && cstNode.element) {
                let hover = this.getAstNodeHover(cstNode.element, highlighter);
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
    getAstNodeHover(node: AstNode, highlight = highlighter): string | undefined {
        const hoverProviders: HoverProviders<string | undefined> = {
            Property: this.getPropertyHover,
            PropertyReference: this.getPropertyReferenceHover,
            Literal: this.getLiteralHover,
            FilePath: this.getLiteralHover,
            Objekt: this.getObjektHover,
            List: this.getListHover,
            Func: this.getFuncHover,
        };
        return this.doGetHover(node, hoverProviders, highlight);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Hover Providers
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    getPropertyHover(prop: ast.Property, highlight = highlighter) {
        const name = prop.name;
        const value = resolveReference(prop.value);
        if (value) {
            let valueText = value.$cstNode?.text || '';
            valueText = ast.isEntity(value.$container) ? valueText : dedent(valueText);
            return highlight(`${name}: ${valueText}`);
        }
        return undefined;
    }

    getPropertyReferenceHover(ref: ast.PropertyReference, highlight = highlighter) {
        const resolved = resolveReference(ref);
        if (resolved !== undefined) {
            return this.getPropertyHover(resolved.$container as ast.Property, highlight);
        }
        return undefined;
    }

    getLiteralHover(literal: ast.Literal | ast.FilePath, highlight = highlighter) {
        if (ast.isNull(literal)) {
            return highlight('null');
        }
        let value = JSON.stringify(literal.value);
        let type = ast.isPrimitive(literal) ? typeof literal.value : literal.$type.toLowerCase();
        return highlight(`${value} : ${type}`, 'json');
    }

    getObjektHover(obj: ast.Objekt, highlight = highlighter) {
        return highlight(dedent(obj.$cstNode?.text || ''));
    }

    getListHover(list: ast.List, highlight = highlighter) {
        return highlight(list.$cstNode?.text);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Function Hover Providers
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Returns Hover text for Functions.
     */
    getFuncHover(node: ast.Func, highlight = highlighter): string | undefined {
        const hoverProviders: HoverProviders<{ signature?: string; description?: string } | undefined> = {
            RandomOfRange: this.getRandomOfRangeHover,
            RandomOfList: this.getRandomOfListHover,
            MapToList: this.getMapToListHover,
            MapToObject: this.getMapToObjectHover,
            CsvFunc: this.getCsvFuncHover,
        };
        let funcHover = this.doGetHover(node, hoverProviders, highlight);
        if (funcHover) {
            let result = dedent`
            ${funcHover.signature || highlight(node.$cstNode?.text)}
            \n---\n
            ${funcHover.description}`;
            return result;
        }
        return undefined;
    }

    getRandomOfRangeHover(func: ast.RandomOfRange) {
        let [min, max] = [func.range.min.value, func.range.max.value];
        return {
            description: `Generates a random number between \`${min}\` and \`${max}\` (ends inclusive).`,
        };
    }

    getRandomOfListHover(_func: ast.RandomOfList) {
        return {
            description: `Generates a random element of the provided arguments.`,
        };
    }

    getMapToListHover(_func: ast.MapToList) {
        return {
            description: `Generates a random number between (ends inclusive).`,
        };
    }

    getMapToObjectHover(func: ast.MapToObject, highlight = highlighter) {
        return {
            description:
                `
                Evaluates the value of \`${func.source.$cstNode?.text}\` and chooses based on the result from \n\n` +
                `
\`\`\`ranger
${func.$cstNode?.text}
\`\`\``,
        };
    }

    getCsvFuncHover(func: ast.CsvFunc, highlight = highlighter) {
        const [filePath, delimiter, noHeader] = [func.filePath.value, func.delimiter, func.noHeader];
        const signature = `csv("${filePath}", delimiter="${delimiter}"${noHeader ? ', noHeader' : ''})`;
        return {
            signature: highlight(signature),
            description: dedent`
                Generates a row of CSV file \`${filePath}\`.

                Detected columns: []

                Sample row: {}`,
        };
    }

    protected doGetHover<R>(node: AstNode, providers: HoverProviders<R>, highlight: CodeHighlighter) {
        const astNode: any = node; // Suppress type checker
        for (let [Type, provider] of Object.entries(providers)) {
            if (ast.reflection.isInstance(astNode, Type)) {
                provider = provider.bind(this);
                return provider(astNode, highlight);
            }
        }
        return undefined;
    }
}

/**
 * Apply Markdown Syntax Highlighting to text.
 */
export const highlighter: CodeHighlighter = (text, language = 'ranger') => {
    if (!text) return undefined;

    return dedent`
    \`\`\`${language}
    ${text}
    \`\`\`
    `;
};
/**
 *
 * Don't apply Syntax Highlighting to text.
 */
export const noHighlight: CodeHighlighter = (text, _language) => text;
