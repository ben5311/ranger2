import { DefaultCompletionProvider, LangiumDocument } from 'langium';
import {
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    CompletionParams,
    InsertTextFormat,
    Range,
} from 'vscode-languageserver';

export class RangerCompletionProvider extends DefaultCompletionProvider {
    CustomSnippets: Record<string, string> = {
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
        '/**': '/**\n$0\n*/',
        'Entity {}': 'Entity $1 {\n\t$0\n}',
    };

    override async getCompletion(document: LangiumDocument, params: CompletionParams) {
        const defaultCompletions = (await super.getCompletion(document, params))?.items || [];
        const customCompletions: CompletionItem[] = [];
        const textDocument = document.textDocument;
        const offset = textDocument.offsetAt(params.position);
        const currentLineUntilCursor: Range = {
            start: { line: params.position.line, character: 0 },
            end: params.position,
        };
        const textToBeCompleted = textDocument.getText(currentLineUntilCursor);
        const acceptor: PartialCompletionItemAcceptor = (partialCompletionItem: PartialCompletionItem) => {
            const fullCompletionItem = this.fillCompletionItem(textDocument, offset, {
                ...partialCompletionItem,
                textEdit: { range: currentLineUntilCursor, newText: partialCompletionItem.insertText },
                insertText: undefined,
            });
            if (fullCompletionItem) customCompletions.push(fullCompletionItem);
        };

        this.addSnippetCompletions(textToBeCompleted, acceptor);

        const allCompletions = customCompletions.concat(defaultCompletions);
        return CompletionList.create(allCompletions, true);
    }

    protected addSnippetCompletions(textToBeCompleted: string, accept: PartialCompletionItemAcceptor) {
        for (const [completion, insertText] of Object.entries(this.CustomSnippets)) {
            if (completion.startsWith(textToBeCompleted)) {
                accept({
                    label: completion,
                    kind: CompletionItemKind.Snippet,
                    detail: 'Snippet',
                    insertText: insertText,
                    insertTextFormat: InsertTextFormat.Snippet,
                    preselect: true,
                });
            }
        }
    }
}

type PartialCompletionItem = Partial<CompletionItem> & { label: string; insertText: string };
type PartialCompletionItemAcceptor = (completionItem: PartialCompletionItem) => void;
