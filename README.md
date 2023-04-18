# Ranger: A test data generator

There are many libraries out there that generate fake data to facilitate testing.

However, Ranger takes a different approach.
Instead of providing pre-built data, it enables users to create customized test data for their specific use case using the **Ranger language**.

This example Ranger file

<!-- markdownlint-disable MD033 -->
<img src="https://raw.githubusercontent.com/ben5311/ranger2/main/images/customer.png" alt="Example Ranger file" width="450"/>

produces output similar to

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

Note that each individual's first name corresponds to their gender.

## How does it work?

Using the Ranger language, you can design test entities specific to your needs in a `.ranger` file. Once you've configured your entities, you can generate test data in one of two ways:

* Use the Ranger Command Line Interface to create CSV or JSONL files containing the data.
* Utilize the JavaScript API to generate JavaScript objects and integrate them directly into your code.

## Getting started

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Install the VS Code [Ranger extension](https://marketplace.visualstudio.com/items?itemName=bheimann.ranger).
3. Open a folder in VS Code
4. Create new file `Customer.ranger`.
5. Paste the following content into the file

    ```ranger
    Entity Customer {
        age: random(20..60)
        gender: random("male", "female")
        firstname: map(gender => {
            "male": random("James", "Robert")
            "female": random("Emily", "Lucy")
        })
        lastname: "Parker"
    }
    ```

6. While editing, right click the editor -> click `Ranger: Generate File`.

## For Developers

### What's in the folder

This folder contains all necessary files for the VS Code Ranger extension.

```text
├── examples                    - Example .ranger files
├── src                 
│   ├── extension.ts            - Main code of the Extension
│   └── language-server         
│       ├── main.ts             - Main code of the Language Server
│       ├── ranger-module.ts    - Dependency injection module
│       └── ranger.langium      - Grammar definition file
├── syntaxes
│   └── ranger.tmLanguage.json  - Syntax Highlighting definition
├── test
├── langium-config.json         - Langium CLI configuration
├── language-configuration.json - VS Code Language configuration
└── package.json                
```

Important to note:

* `package.json` is the manifest file in which language support is declared.
* `extension.ts` - is responsible for launching the Language Server and Client.
* `main.ts` - the entry point of the Language Server process.
* `ranger.langium` - the grammar definition of the Ranger language.
* `ranger-module.ts` - Use this to register overridden and added services.

### Get up and running

1. Ensure that [Node](https://nodejs.org/en/download/) is installed.
2. Run `npm install` to download all project dependencies.
3. Run `npm run watch` to generate TypeScript code from the grammar definition and to compile it to JavaScript.

    This task runs automatically the next time you open this project folder with VS Code.
4. Press `F5` to open a new window with the extension loaded (VS Code Extension Host).
5. Open a file inside `examples` folder or create a new file with file name suffix `.ranger`.
6. Verify that syntax highlighting, validation, completion etc. are working as expected.

### Make changes

* Changes to the grammar and the source code take effect when you reload the VS Code Extension Host (`Ctrl+R` or `Cmd+R` on Mac).
Alternatively, close the Extension Host and press `F5` again.

### Debug

* Make sure that the launch configuration `Debug Extension` is enabled.
* Set breakpoints as you like in any TypeScript file.
* Press `F5` to run the VS Code Extension Host.
* Note that Debugging works only after a 5-10 seconds delay because it takes a while to attach to the Language Server process.

### Test

* Add your `**.test.js` file to `test` folder.
* Run `npm test`.
* Alternatively, you can use VS Code extension [Vitest](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) to run the tests.

### Package

* Run `npm run package` to create a VS Code `.vsix` extension file that can be installed in any VS Code editor.

### To Go Further

Documentation about the Langium framework is available at <https://langium.org/docs>.

Langium GitHub-Repository with lots of sample code: <https://github.com/langium/langium>.
