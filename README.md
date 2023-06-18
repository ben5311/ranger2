# Ranger: A test data generator

Ranger is a test data generator that lets you create customized, correlated test data using the  **Ranger language**.

This example Ranger file

<!-- markdownlint-disable MD033 -->
<img src="https://raw.githubusercontent.com/ben5311/ranger2/main/images/example.png" alt="Example Ranger file" width="450"/>

produces such an output

```json
{"age":21,"gender":"male","firstname":"James","lastname":"Parker"}
{"age":58,"gender":"male","firstname":"James","lastname":"Parker"}
{"age":26,"gender":"female","firstname":"Emily","lastname":"Parker"}
{"age":51,"gender":"male","firstname":"James","lastname":"Parker"}
{"age":59,"gender":"male","firstname":"Robert","lastname":"Parker"}
{"age":60,"gender":"female","firstname":"Lucy","lastname":"Parker"}
{"age":41,"gender":"male","firstname":"Robert","lastname":"Parker"}
{"age":51,"gender":"female","firstname":"Lucy","lastname":"Parker"}
{"age":41,"gender":"male","firstname":"James","lastname":"Parker"}
{"age":39,"gender":"male","firstname":"Robert","lastname":"Parker"}
```

Find more examples [here](examples).

## How does it work?

You design test entities specific to your needs in a `.ranger` file.

Then, there are two ways to generate data:

* Use the `ranger` command line tool to create CSV or JSONL files.
* Use the JavaScript API to generate JS objects and use them in your code.

## Read more

* The [ranger](packages/ranger-lang/README.md#command-line-interface)  command line tool.
* The [JavaScript API](packages/ranger-lang/README.md#javascript-api).
* Get editing assistance via the [Visual Studio Code Extension](packages/ranger-vscode/README.md#visual-studio-code-extension).

## For Developers

This project contains all necessary files for the Ranger JavaScript API, the CLI and the VS Code extension.

It's built using the [Langium](https://langium.org/) framework.

### What's in the folder?

<!-- tree -L 5 -I 'node_modules|out|lib|generated|images|README.md' -->
```text
├── examples                            - Example .ranger files
├── packages
│   │
│   ├── ranger-lang
│   │   ├── src
│   │   │   ├── cli
│   │   │   └── language-server
│   │   │       ├── main.ts             - Main code of the Language Server
│   │   │       ├── ranger-module.ts    - Dependency injection module
│   │   │       └── ranger.langium      - Grammar definition file
│   │   ├── test
│   │   ├── langium-config.json         - Langium configuration
│   │   └── package.json
│   │
│   └── ranger-vscode
│       ├── src
│       │   └── extension.ts            - Main code of the VS Code extension
│       ├── syntaxes
│       │   └── ranger.tmLanguage.json  - VS Code syntax highlighting definition
│       ├── language-configuration.json - VS Code language configuration
│       └── package.json                - VS Code language support declaration
│
└── package.json
```

Important to note:

* `main.ts` - is the entry point of the Language Server process.
* `ranger.langium` - the grammar definition of the Ranger language.
* `ranger-module.ts` - Use this to register overridden and added services.
* `extension.ts` - is responsible for launching the Language Server and Client.

### Get up and running

1. Open the project folder in [VS Code](https://code.visualstudio.com/).
2. Ensure that [Node.js](https://nodejs.org/en/download/) is installed.
3. Run `npm install` to download all project dependencies.
4. Close VS Code and reopen the project folder.
5. Press `F5` to open a new window with the extension loaded (VS Code Extension Host).
6. Open a file inside `examples` folder or create a new file with file name suffix `.ranger`.
7. Verify that syntax highlighting, validation, completion etc. are working as expected.

### Make changes

* There is a background task that automatically compiles changes to the grammar
and the source code into JavaScript code.
* To apply the changes, reload the VS Code Extension Host (`Ctrl+R` or `Cmd+R` on Mac).
* Alternatively, you can close the Extension Host and press `F5` again.
* If the changes don't seem to take effect, go to the VS Code Terminal panel and check for errors in the output of the `npm watch` task.

### Debug

* Make sure that the launch configuration `Debug Extension` is enabled.
* Set breakpoints as you like in any TypeScript file.
* Press `F5` to run the VS Code Extension Host.
* Note that Debugging works only after a 5-10 seconds delay because it takes a while to attach to the Language Server process.

### Test

* Add your `**.test.js` file to `test` folder.
* Run `npm test`.
* Alternatively, you can use VS Code extension [Vitest Runner](https://marketplace.visualstudio.com/items?itemName=kingwl.vscode-vitest-runner) to run the tests.

### Package

* Run `npm run package:vscode` to create a VS Code `.vsix` extension file that can be installed in any VS Code editor.
* Run `npm run package:cli` to create binaries for the `ranger` command line tool.

### To Go Further

Documentation about the Langium framework is available at <https://langium.org/docs>.

Langium GitHub-Repository with lots of sample code: <https://github.com/langium/langium>.
