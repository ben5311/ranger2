import { CompletionAcceptor, CompletionContext, DefaultCompletionProvider, LangiumDocument } from 'langium';
import * as ast from 'langium/lib/grammar/generated/ast';
import { CompletionItemKind, CompletionParams, InsertTextFormat } from 'vscode-languageserver';

export class RangerCompletionProvider extends DefaultCompletionProvider {
    DocumentSnippets: Record<string, string> = {
        /**
         * A snippet can define tab stops and placeholders with `$1`, `$2`
         * and `${3:foo}`. `$0` defines the final tab stop, it defaults to
         * the end of the snippet. Placeholders with equal identifiers are linked,
         * that is typing in one will update others too.
         *
         * See also:
         * https://microsoft.github.io/language-server-protocol/specifications/specification-current/#snippet_syntax
         */
        '//': '// $0',
        '/*': '/*\n$0\n*/',
    };
    KeywordSnippets: Record<string, string> = {
        'from "" import': 'from "$1" import $0',
        'Entity {}': 'Entity $0 {\n\t\n}',
        'random()': 'random($0)',
        'random(a..b)': 'random($1..$0)',
        'map(=>[])': 'map($1 => [$0])', // TODO: show only references having a list as completions for source ref
        'map(=>{})': 'map($1 => {$0})',
        'csv()': 'csv("$0")',
        'csv(delimiter)': 'csv("$0", delimiter=",")',
        'csv(delimiter,noHeader)': 'csv("$0", delimiter=",", noHeader)',
        'sequence()': 'sequence(1)',
        'uuid()': 'uuid()',
    };

    // TODO: Add auto completion and Go To Definition for FilePaths

    /**
     * Provides custom Completions when the cursor is at the beginning of the line.
     */
    override async getCompletion(document: LangiumDocument, params: CompletionParams) {
        const completions = await super.getCompletion(document, params);
        if (params.position.character == 0) {
            const offset = document.textDocument.offsetAt(params.position);
            Object.entries(this.DocumentSnippets).forEach(([key, value], index) => {
                const completionItem = this.fillCompletionItem(document.textDocument, offset, {
                    label: key,
                    kind: CompletionItemKind.Text,
                    detail: 'Snippet',
                    insertText: value,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: `-1000${index}`,
                });
                if (completionItem) completions?.items.push(completionItem);
            });
        }
        return completions;
    }

    /**
     * Provides custom context-aware completions for language keywords.
     */
    override completionForKeyword(context: CompletionContext, keyword: ast.Keyword, accept: CompletionAcceptor) {
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
