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
import { executeProvider, Providers } from './ranger-ast';
import { generator, isListFunc } from './ranger-generator';
import { getPropertyName, resolveReference } from './ranger-scope';

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
                        range: cstNode.range,
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
        const hoverProviders: Providers<string | undefined> = {
            Func: this.getFuncHover,
            Property: getPropertyHover,
            PropertyReference: getPropertyReferenceHover,
            Literal: getLiteralHover,
            Obj: getJsonHover,
            List: getJsonHover,
            Value: getJsonHover,
        };
        const hover = executeProvider(hoverProviders, node, highlight);
        return hover;
    }

    /**
     * Returns Hover text for Functions.
     */
    getFuncHover(node: ast.Func, highlight = highlighter): string | undefined {
        const hoverProviders: Providers<FuncHover> = {
            RandomOfRange: getRandomOfRangeHover,
            RandomOfList: getRandomOfListHover,
            MapToList: getMapToListHover,
            MapToObject: getMapToObjectHover,
            CsvFunc: getCsvHover,
            SequenceFunc: getSequenceHover,
            UuidFunc: getUuidHover,
            Regex: getRegexHover,
            TodayFunc: getTodayHover,
            NowFunc: getNowHover,
        };
        let funcHover = executeProvider(hoverProviders, node, highlight);
        let result = dedent`
        ${highlight(funcHover?.signature || node.$cstNode?.text)}
        \n---\n
        ${funcHover?.description}

        ${highlight(`Example: ${generator.getValueAsJson(node)}`)}`;
        return result;
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hover Providers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getPropertyHover(prop: ast.Property, highlight = highlighter) {
    const name = prop.name;
    const value = resolveReference(prop.value);
    if (value) {
        let valueText = generator.getValueAsJson(value);
        return highlight(`${name}: ${valueText}`);
    }
    return undefined;
}

function getPropertyReferenceHover(ref: ast.PropertyReference, highlight = highlighter) {
    const resolved = resolveReference(ref);
    if (resolved !== undefined) {
        let valueText = generator.getValueAsJson(resolved);
        return highlight(`${getPropertyName(ref)}: ${valueText}`);
    }
    return undefined;
}

function getLiteralHover(literal: ast.Literal, highlight = highlighter) {
    let type = literal.$type.substring(1).toLowerCase(); // Strip leading A from AString, ANumber, ...
    let value = literal.$cstNode?.text;

    if (type === 'null') {
        return highlight(`null`);
    } else {
        return highlight(`${value} : ${type}`);
    }
}

function getJsonHover(value: ast.Value, highlight = highlighter) {
    let valueText = generator.getValueAsJson(value);
    return highlight(valueText);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Function Hover Providers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getRandomOfRangeHover(func: ast.RandomOfRange): FuncHover {
    let [min, max] = [func.range.min.value, func.range.max.value];
    return { description: `Generates a random number between \`${min}\` and \`${max}\` (ends inclusive).` };
}

function getRandomOfListHover(_func: ast.RandomOfList): FuncHover {
    return { description: `Generates a random element of the provided arguments.` };
}

function getMapToListHover(func: ast.MapToList): FuncHover {
    const sourceRef = func.source.$cstNode?.text;
    const source = resolveReference(func.source);
    const firstSourceVal = isListFunc(source) ? source.list.values[0] : undefined;
    const firstTargetVal = func.list.values[0];
    let description = dedent`
        Evaluates the value of \`${sourceRef}\` and chooses based on the result from possible values \\
        on the right hand side.`;
    if (firstSourceVal && firstTargetVal) {
        description += dedent`
        \n
        For example, if \`${sourceRef}\` matches \`${firstSourceVal.$cstNode?.text}\`,
        \`${firstTargetVal.$cstNode?.text}\` is returned.`;
    }
    return { description };
}

function getMapToObjectHover(func: ast.MapToObject): FuncHover {
    const sourceRef = func.source.$cstNode?.text;
    const firstPair = func.object.pairs[0];
    let description = dedent`
        Evaluates the value of \`${sourceRef}\` and chooses based on the result from possible values \\
        on the right hand side.`;
    if (firstPair) {
        description += dedent`
        \n
        For example, if \`${sourceRef}\` matches \`${firstPair.key.$cstNode?.text}\`,
        \`${firstPair.value.$cstNode?.text}\` is returned.`;
    }
    return { description };
}

function getCsvHover(func: ast.CsvFunc): FuncHover {
    const [filePath, delimiter, noHeader] = [func.filePath.value, func.delimiter, func.noHeader];
    const signature = `csv("${filePath}", delimiter="${delimiter}"${noHeader ? ', noHeader' : ''})`;
    return { signature, description: `Generates a random row of CSV file \`${filePath}\`.` };
}

function getSequenceHover(func: ast.SequenceFunc): FuncHover {
    const start = func.start.value;
    return { description: `Generates number sequence \`${start}, ${start + 1}, ${start + 2}, ...\`` };
}

function getUuidHover(_func: ast.UuidFunc): FuncHover {
    return { description: `Generates a random [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier).` };
}

function getRegexHover(func: ast.Regex): FuncHover {
    return {
        signature: `${func.$cstNode?.text} : regex`,
        description: `Generates a random string that matches given [Regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions).`,
    };
}

function getTodayHover(_func: ast.TodayFunc): FuncHover {
    return { description: `Retrieves the current date.\n\nIt is determined once and remains constant throughout.` };
}

function getNowHover(_func: ast.NowFunc): FuncHover {
    return {
        description: `Retrieves the current timestamp.\n\nIt is determined once and remains constant throughout.`,
    };
}

type FuncHover = { signature?: string; description?: string } | undefined;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Code Highlighter
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

type CodeHighlighter = (text?: string, language?: string) => string | undefined;

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
