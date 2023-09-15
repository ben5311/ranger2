import fs from 'fs';
import { AstNode, CompletionAcceptor, CompletionContext, DefaultCompletionProvider, NextFeature } from 'langium';
import { AbstractElement, Keyword } from 'langium/lib/grammar/generated/ast';
import path, { ParsedPath } from 'path';
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';

import { getValues, MaybeArray } from '../utils/types';
import { executeProvider, Providers } from './ast/Providers';
import * as ast from './generated/ast';
import { getDocumentDir } from './ranger-documents';

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
    KeywordSnippets: Record<string, MaybeArray<{ label: string; completion: string }>> = {
        from: { label: 'from "" import', completion: 'from "$1" import $0' },
        Entity: { label: 'Entity {}', completion: 'Entity $0 {\n\t\n}' },
        random: [
            { label: 'random()', completion: 'random($0)' },
            { label: 'random(a..b)', completion: 'random($1..$0)' },
        ],
        randomNormal: { label: 'randomNormal(mean,std)', completion: 'randomNormal($1..$2, mean=$3, std=$0)' },
        weighted: { label: 'weighted()', completion: 'weighted($1:50, $0:50)' },
        map: [
            { label: 'map(=>[])', completion: 'map($1 => [$0])' },
            { label: 'map(=>{})', completion: 'map($1 => {$0})' },
        ],
        csv: [
            { label: 'csv()', completion: 'csv("$0")' },
            { label: 'csv(delimiter)', completion: 'csv("$0", delimiter=",")' },
            { label: 'csv(delimiter,noHeader)', completion: 'csv("$0", delimiter=",", noHeader)' },
        ],
        sequence: { label: 'sequence()', completion: 'sequence(1)' },
        uuid: { label: 'uuid()', completion: 'uuid()' },
        today: [
            { label: 'today', completion: 'today' },
            { label: 'today.plus()', completion: 'today.plus(0$0 DAYS 0 MONTHS 0 WEEKS 0 YEARS)' },
        ],
        now: [
            { label: 'now', completion: 'now' },
            { label: 'now.plus()', completion: 'now.plus(0$0 DAYS 0 MONTHS 0 WEEKS 0 YEARS)' },
        ],
        f: [
            { label: 'f""', completion: 'f"$0"' },
            { label: 'f"" % {}', completion: 'f"$1" % {"$2": $0}' },
        ],
    };
    DocumentSnippets: Record<string, string> = {
        '//': '// $0',
        '/*': '/*\n$0\n*/',
    };

    protected override async completionFor(
        context: CompletionContext,
        next: NextFeature<AbstractElement>,
        acceptor: CompletionAcceptor,
    ) {
        await super.completionFor(context, next, acceptor);

        this.addDocumentSnippets(context, acceptor);

        if (context.node) {
            this.completionForNode(context.node, context, acceptor);
        }
    }

    /**
     * Provides custom Completions when the cursor is at the beginning of the line.
     */
    addDocumentSnippets(context: CompletionContext, accept: CompletionAcceptor) {
        if (context.position.character == 0) {
            Object.entries(this.DocumentSnippets).forEach(([key, value], index) => {
                accept(context, {
                    label: key,
                    kind: CompletionItemKind.Text,
                    detail: 'Snippet',
                    insertText: value,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: '-1' + String(index).padStart(5, '0'),
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
        const index = Object.keys(this.KeywordSnippets).indexOf(keyword.value);
        if (index == -1) {
            return super.completionForKeyword(context, keyword, accept);
        }

        const snippets = getValues(this.KeywordSnippets[keyword.value]);

        for (const snippet of snippets) {
            accept(context, {
                label: snippet.label,
                kind: CompletionItemKind.Function,
                detail: 'Snippet',
                insertText: snippet.completion,
                insertTextFormat: InsertTextFormat.Snippet,
                sortText: '-0' + String(index).padStart(5, '0'),
            });
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
        accept(context, {
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

export interface Path extends ParsedPath {
    path: string;
}
