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
        'Entity {}': 'Entity $0 {\n\t\n}',
        'print()': 'print($0)',
        'random([])': 'random([$0])',
        'random(a..b)': 'random($1..$0)',
    };

    /**
     * Provides custom Completions when the cursor is at the beginning of the line.
     */
    override async getCompletion(document: LangiumDocument, params: CompletionParams) {
        const completions = await super.getCompletion(document, params);
        if (params.position.character == 0) {
            const offset = document.textDocument.offsetAt(params.position);
            for (const [completion, insertText] of Object.entries(this.DocumentSnippets)) {
                const completionItem = this.fillCompletionItem(document.textDocument, offset, {
                    label: completion,
                    kind: CompletionItemKind.Text,
                    detail: 'Snippet',
                    insertText: insertText,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: '1',
                });
                if (completionItem) completions?.items.push(completionItem);
            }
        }
        return completions;
    }

    /**
     * Provides custom context-aware completions for language keywords.
     */
    override completionForKeyword(context: CompletionContext, keyword: ast.Keyword, accept: CompletionAcceptor) {
        let matched = false;
        for (const [completion, insertText] of Object.entries(this.KeywordSnippets)) {
            if (completion.startsWith(keyword.value)) {
                accept({
                    label: completion,
                    kind: CompletionItemKind.Function,
                    detail: 'Snippet',
                    insertText: insertText,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: '-1',
                });
                matched = true;
            }
        }
        if (!matched) {
            return super.completionForKeyword(context, keyword, accept);
        }
    }
}
