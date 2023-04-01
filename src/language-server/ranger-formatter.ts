import {
    AbstractFormatter,
    AstNode,
    CstNode,
    Formatting,
    FormattingAction,
    FormattingContext,
    isRootCstNode,
} from 'langium';
import { TextEdit } from 'vscode-languageserver';

import * as ast from './generated/ast';

export class RangerFormatter extends AbstractFormatter {
    protected format(node: AstNode): void {
        if (ast.isDocument(node)) {
            //const formatter = this.getNodeFormatter(node);
        } else if (ast.isEntity(node)) {
            const formatter = this.getNodeFormatter(node);
            const bracesOpen = formatter.keyword('{');
            const bracesClose = formatter.keyword('}');
            formatter.interior(bracesOpen, bracesClose).prepend(Formatting.indent({ allowMore: true }));
            bracesClose.prepend(Formatting.newLine()).append(Formatting.newLines(2));
        }
    }

    override createTextEdit(
        a: CstNode | undefined,
        b: CstNode,
        formatting: FormattingAction,
        context: FormattingContext,
    ): TextEdit[] {
        // Fix for no blank lines between entities if they have a docstring on top
        if (b.hidden && b.text.match(/\/[/*]/) && isRootCstNode(b.parent)) {
            b = {
                parent: b.parent,
                text: b.text,
                root: b.root,
                feature: b.feature,
                element: b.element,
                range: b.range,
                offset: b.offset,
                length: b.length,
                end: b.end,
                hidden: false,
            };
        }
        return super.createTextEdit(a, b, formatting, context);
    }
}
