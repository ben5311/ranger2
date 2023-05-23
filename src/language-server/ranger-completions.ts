import fs from 'fs';
import {
    AstNode,
    CompletionAcceptor,
    CompletionContext,
    DefaultCompletionProvider,
    findLeafNodeAtOffset,
    getEntryRule,
    LangiumDocument,
    NextFeature,
    stream,
} from 'langium';
import { isKeyword, Keyword } from 'langium/lib/grammar/generated/ast';
import path from 'path';
import {
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    CompletionParams,
    InsertTextFormat,
} from 'vscode-languageserver';

import { getDocumentDir } from '../utils/documents';
import { Path } from '../utils/types';
import * as ast from './generated/ast';
import { executeProvider, Providers } from './ranger-ast';

export class RangerCompletionProvider extends DefaultCompletionProvider {
    /**
     * A snippet can define tab stops and placeholders with `$1`, `$2`
     * and `${3:foo}`. `$0` defines the final tab stop, it defaults to
     * the end of the snippet. Placeholders with equal identifiers are linked,
     * that is typing in one will update others too.
     *
     * @see
     * https://microsoft.github.io/language-server-protocol/specifications/specification-current/#snippet_syntax
     */
    KeywordSnippets: Record<string, string> = {
        'from "" import': 'from "$1" import $0',
        'Entity {}': 'Entity $0 {\n\t\n}',
        'random()': 'random($0)',
        'random(a..b)': 'random($1..$0)',
        'map(=>[])': 'map($1 => [$0])',
        'map(=>{})': 'map($1 => {$0})',
        'csv()': 'csv("$0")',
        'csv(delimiter)': 'csv("$0", delimiter=",")',
        'csv(delimiter,noHeader)': 'csv("$0", delimiter=",", noHeader)',
        'sequence()': 'sequence(1)',
        'uuid()': 'uuid()',
    };
    DocumentSnippets: Record<string, string> = {
        '//': '// $0',
        '/*': '/*\n$0\n*/',
    };

    override async getCompletion(document: LangiumDocument, params: CompletionParams) {
        const root = document.parseResult.value;
        const cst = root.$cstNode;
        if (!cst) {
            return undefined;
        }
        const items: CompletionItem[] = [];
        const textDocument = document.textDocument;
        const text = textDocument.getText();
        const offset = textDocument.offsetAt(params.position);
        const acceptor: CompletionAcceptor = (value) => {
            const completionItem = this.fillCompletionItem(textDocument, offset, value);
            if (completionItem) {
                items.push(completionItem);
            }
        };

        const node = findLeafNodeAtOffset(cst, this.backtrackToAnyToken(text, offset));

        const context: CompletionContext = {
            document,
            textDocument,
            node: node?.element,
            offset,
            position: params.position,
        };

        if (!node) {
            const parserRule = getEntryRule(this.grammar)!;
            await this.completionForRule(context, parserRule, acceptor);
            return CompletionList.create(items, true);
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Custom completions
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        this.addDocumentSnippets(context, acceptor);

        if (context.node) {
            this.completionForNode(context.node, context, acceptor);
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        const parserStart = this.backtrackToTokenStart(text, offset);
        const beforeFeatures = this.findFeaturesAt(textDocument, parserStart);
        let afterFeatures: NextFeature[] = [];
        const reparse = this.canReparse() && offset !== parserStart;
        if (reparse) {
            afterFeatures = this.findFeaturesAt(textDocument, offset);
        }

        const distinctionFunction = (el: NextFeature) => (isKeyword(el.feature) ? el.feature.value : el.feature);

        await Promise.all(
            stream(beforeFeatures)
                .distinct(distinctionFunction)
                .map((e) => this.completionFor(context, e, acceptor)),
        );

        if (reparse) {
            await Promise.all(
                stream(afterFeatures)
                    .exclude(beforeFeatures, distinctionFunction)
                    .distinct(distinctionFunction)
                    .map((e) => this.completionFor(context, e, acceptor)),
            );
        }

        return CompletionList.create(items, true);
    }

    /**
     * Provides custom Completions when the cursor is at the beginning of the line.
     */
    addDocumentSnippets(context: CompletionContext, accept: CompletionAcceptor) {
        if (context.position.character == 0) {
            Object.entries(this.DocumentSnippets).forEach(([key, value], index) => {
                accept({
                    label: key,
                    kind: CompletionItemKind.Text,
                    detail: 'Snippet',
                    insertText: value,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: `-1000${index}`,
                });
            });
        }
    }

    /**
     * Provides custom Completions for specific Nodes.
     */
    completionForNode(node: AstNode, context: CompletionContext, accept: CompletionAcceptor) {
        const providers: Providers<void> = {
            AFilePath: completionForFilePath,
        };
        executeProvider(providers, node, accept, context);
    }

    /**
     * Provides custom Completions for language keywords.
     */
    override completionForKeyword(context: CompletionContext, keyword: Keyword, accept: CompletionAcceptor) {
        let matched = false;
        Object.entries(this.KeywordSnippets).forEach(([key, value], index) => {
            if (key.startsWith(keyword.value)) {
                accept({
                    label: key,
                    kind: CompletionItemKind.Function,
                    detail: 'Snippet',
                    insertText: value,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: `-0000${index}`,
                });
                matched = true;
            }
        });
        if (!matched) {
            return super.completionForKeyword(context, keyword, accept);
        }
    }
}

function completionForFilePath(filePath: ast.AFilePath, accept: CompletionAcceptor, context: CompletionContext) {
    if (!filePath.$cstNode) {
        return;
    }
    const filePrefix = filePath.value.substring(0, context.offset - filePath.$cstNode.offset - 1);
    const expectedSuffix = ast.isImport(filePath.$container) ? '.ranger' : '.csv';
    let files = listFilesWithPrefix(filePrefix, { workingDir: getDocumentDir(filePath), suffix: expectedSuffix });

    files.forEach((file) => {
        const isDir = isDirectory(file.path);
        accept({
            label: file.base,
            kind: CompletionItemKind.File,
            detail: isDir ? 'Folder' : 'File',
            sortText: `-${isDir ? '1000' : '0000'}${file.base}`,
        });
    });
}

function listFilesWithPrefix(prefix: string, opts: { workingDir?: string; suffix?: string }): Path[] {
    let dirname: string;
    let basename: string;
    if (prefix.match(/[\\/]$/)) {
        dirname = prefix;
        basename = '';
    } else {
        dirname = path.dirname(prefix);
        basename = path.basename(prefix);
    }
    dirname = path.join(opts.workingDir ?? '', dirname);

    if (isDirectory(dirname)) {
        const files = fs
            .readdirSync(dirname)
            .filter((file) => file.startsWith(basename))
            .filter((file) => file.endsWith(opts.suffix ?? '') || isDirectory(file))
            .map((file) => path.join(dirname, file))
            .map((absPath) => {
                return { ...path.parse(absPath), path: absPath };
            });
        return files;
    }

    return [];
}

function isDirectory(filePath: string): boolean {
    return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}
