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

import { generateOutputFile } from '../cli';
import { hasNoErrors } from '../utils/documents';
import { RangerDocumentBuilder } from './ranger-index';

export class RangerExecuteCommandHandler extends AbstractExecuteCommandHandler {
    protected readonly config: ConfigurationProvider;
    protected readonly lspConnection: lsp.Connection;
    protected readonly documentBuilder: RangerDocumentBuilder;
    protected readonly fileWatchers: Set<string>;

    constructor(protected services: LangiumSharedServices) {
        super();
        this.config = services.workspace.ConfigurationProvider;
        this.lspConnection = services.lsp.Connection!;
        this.fileWatchers = new Set();
        this.documentBuilder = services.workspace.DocumentBuilder as RangerDocumentBuilder;
        this.documentBuilder.onBuildPhase(DocumentState.Validated, (documents, _cancelToken) => {
            documents
                .filter(hasNoErrors)
                .filter((doc) => this.fileWatchers.has(doc.uri.toString()))
                .forEach((doc) => this.generateFile(doc.uri.toString()));
        });
    }

    registerCommands(register: ExecuteCommandAcceptor): void {
        register('ranger.generateFile', async (args) => {
            const fileUri: string = args[0].external;
            return await this.generateFile(fileUri, true);
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

    async generateFile(fileUri: string, showGeneratedFile = false): Promise<object> {
        const filePath = url.fileURLToPath(fileUri);
        const fileName = path.parse(filePath).name;
        const conf = await this.config.getConfiguration('ranger', 'generate');

        try {
            await generateOutputFile(filePath, { count: conf.count, format: conf.format, outputDir: 'generated' });
        } catch (error) {
            return { success: false, message: `Error generating file [${filePath}]`, detail: error };
        }

        if (showGeneratedFile) {
            this.lspConnection.sendRequest(lsp.ShowDocumentRequest.type, {
                uri: url.pathToFileURL(`generated/${fileName}.${conf.format}`).toString(),
            });
        }

        return { sucess: true, message: `Successfully generated file [${filePath}]` };
    }
}
