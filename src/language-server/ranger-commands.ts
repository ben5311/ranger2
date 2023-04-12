import {
    AbstractExecuteCommandHandler,
    ConfigurationProvider,
    DocumentState,
    ExecuteCommandAcceptor,
    LangiumSharedServices,
} from 'langium';
import path from 'path';
import url from 'url';
import * as lsp from 'vscode-languageserver';
import { URI } from 'vscode-uri';

import { generateOutputFile } from '../cli';
import { hasNoErrors } from '../utils/documents';

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
            return await this.generateFile(URI.parse(fileUri), true);
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
        const fileName = path.parse(fileUri.fsPath).name;
        const config = await this.config.getConfiguration('ranger', 'generate');

        try {
            // We pass the document text here instead of the file path
            // because it can be more recent than the file content on disk
            // (e.g. when a file is changed but not yet saved by the editor)
            await generateOutputFile(
                { text: document.textDocument.getText(), fileName },
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
                uri: url.pathToFileURL(`generated/${fileName}.${config.format}`).toString(),
            });
        }

        return { sucess: true, message: `Successfully generated file [generated/${fileName}.${config.format}]` };
    }
}
