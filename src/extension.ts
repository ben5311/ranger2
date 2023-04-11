import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

// This function is called when the extension is activated.
export function activate(context: vscode.ExtensionContext): void {
    client = startLanguageClient(context);
}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    if (client) {
        return client.stop();
    }
    return undefined;
}

function startLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join('out', 'language-server', 'main'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By using --inspect-brk instead of --inspect, the language server will wait until a debugger is attached.
    const inspectMode = process.env.DEBUG_BREAK ? '--inspect-brk' : '--inspect';
    const debugPort = process.env.DEBUG_SOCKET || '6009';
    const debugOptions = { execArgv: ['--nolazy', `${inspectMode}=${debugPort}`] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
    };

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.ranger');
    context.subscriptions.push(fileSystemWatcher);

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'ranger' }],
        synchronize: {
            // Notify the server about file changes to files contained in the workspace
            fileEvents: fileSystemWatcher,
        },
        middleware: {
            // Decorate inline values for currently active Ranger document.
            async provideDocumentSymbols(document, token, next) {
                const documentSymbols = await next(document, token);
                const activeDocument = vscode.window.activeTextEditor?.document;
                if (document.uri === activeDocument?.uri) {
                    const decorations: vscode.DecorationOptions[] = [];
                    addDecorations(documentSymbols, decorations);
                    vscode.window.activeTextEditor?.setDecorations(decorationTemplate, decorations);
                    ILanguageFeaturesService;
                }
                return documentSymbols;
            },
        },
    };

    // Create the language client and start the client.
    const client = new LanguageClient('ranger', 'Ranger', serverOptions, clientOptions);

    // Start the client. This will also launch the server
    client.start();
    return client;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Inline values decorator service
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

type Symbols = vscode.SymbolInformation[] | vscode.DocumentSymbol[] | null | undefined;
function addDecorations(symbols: Symbols, decorations: vscode.DecorationOptions[]) {
    for (const symbol of symbols || []) {
        if ('selectionRange' in symbol) {
            const range = symbol.selectionRange;
            decorations.push({
                range: new vscode.Range(range.start.line, range.start.character, range.end.line, Number.MAX_VALUE),
                renderOptions: {
                    after: { contentText: symbol.detail },
                },
            });
            if (symbol.children) {
                addDecorations(symbol.children, decorations);
            }
        }
    }
}

const decorationTemplate = vscode.window.createTextEditorDecorationType({
    after: {
        color: new vscode.ThemeColor('ranger.inlineText'),
        fontStyle: 'normal',
        fontWeight: 'normal',
        margin: '0 0 0 4ch',
    },
});
