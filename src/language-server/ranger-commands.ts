import {
    AbstractExecuteCommandHandler,
    ConfigurationProvider,
    DocumentState,
    ExecuteCommandAcceptor,
    LangiumSharedServices,
} from 'langium';
import * as lsp from 'vscode-languageserver';
import { URI } from 'vscode-uri';

import { generateOutputFile } from '../cli/generator';
import { fileURI, hasNoErrors, parseURI } from '../utils/documents';

export class RangerExecuteCommandHandler extends AbstractExecuteCommandHandler {
    protected readonly config: ConfigurationProvider;
    protected readonly lspConnection: lsp.Connection;
    protected readonly fileWatchers: Set<string>;

    constructor(protected services: LangiumSharedServices) {
        super();
        this.config = services.workspace.ConfigurationProvider;
        this.lspConnection = services.lsp.Connection!;
        this.fileWatchers = new Set();
        services.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, (documents, _cancelToken) => {
            documents
                .filter(hasNoErrors)
                .filter((doc) => this.fileWatchers.has(doc.uri.toString()))
                .forEach((doc) => this.generateFile(doc.uri));
        });
    }

    registerCommands(register: ExecuteCommandAcceptor): void {
        register('ranger.generateFile', async (args) => {
            const fileUri: string = args[0].external;
            return await this.generateFile(parseURI(fileUri), true);
        });

        register('ranger.toggleWatchFile', async (args) => {
            const fileUri = args[0].external;
            if (this.fileWatchers.has(fileUri)) {
                this.fileWatchers.delete(fileUri);
            } else {
                this.fileWatchers.add(fileUri);
            }
        });
    }

    async generateFile(fileUri: URI, showGeneratedFile = false): Promise<object> {
        const document = this.services.workspace.LangiumDocuments.getOrCreateDocument(fileUri);
        const config = await this.config.getConfiguration('ranger', 'generate');
        let outputFilePath: string;

        try {
            // We pass the document text here because it can be newer than the file
            // content on disk (e.g. when a file is changed but not yet saved by the editor)
            outputFilePath = await generateOutputFile(
                { filePath: fileUri.fsPath, text: document.textDocument.getText() },
                {
                    count: config.count,
                    format: config.format,
                    outputDir: 'generated',
                },
            );
        } catch (error) {
            return { success: false, message: 'Error generating file', detail: error };
        }

        if (showGeneratedFile) {
            this.lspConnection.sendRequest(lsp.ShowDocumentRequest.type, {
                uri: fileURI(outputFilePath).toString(),
            });
        }

        return { sucess: true, message: `Successfully generated file [${outputFilePath}]` };
    }
}
