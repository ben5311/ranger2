import {
    AbstractExecuteCommandHandler,
    ConfigurationProvider,
    ExecuteCommandAcceptor,
    LangiumSharedServices,
} from 'langium';
import path from 'path';
import url from 'url';
import * as lsp from 'vscode-languageserver';

import { generateOutputFile } from '../cli';
import { Config } from './ranger-config';
import { RangerDocumentBuilder } from './ranger-index';

export class RangerExecuteCommandHandler extends AbstractExecuteCommandHandler {
    protected readonly documentBuilder: RangerDocumentBuilder;
    protected readonly config: ConfigurationProvider;
    protected readonly lspConnection: lsp.Connection;

    constructor(protected services: LangiumSharedServices) {
        super();
        this.documentBuilder = services.workspace.DocumentBuilder as RangerDocumentBuilder;
        this.config = services.workspace.ConfigurationProvider;
        this.lspConnection = services.lsp.Connection!;
    }

    registerCommands(register: ExecuteCommandAcceptor): void {
        register('ranger.generateFile', async (args) => {
            const filePath: string = args[0].fsPath;
            const conf = await this.config.getConfiguration('ranger', 'generate');
            await generateOutputFile(filePath, { count: conf.count, format: conf.format, outputDir: 'generated' });
            this.lspConnection.sendRequest(lsp.ShowDocumentRequest.type, {
                uri: url.pathToFileURL(`generated/${path.parse(filePath).name}.${conf.format}`).toString(),
            });
        });

        register('ranger.toggleDebugView', () => {
            Config.debug = !Config.debug;
            this.documentBuilder.invalidateAllDocuments();
        });
    }
}
