import dedent from 'dedent-js';

export type CodeHighlighter = (text?: string, language?: string) => string | undefined;
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
