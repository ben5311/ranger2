# Ranger: A test data generator

Ranger is a test data generator that lets you create customized, correlated test data using the  **Ranger language**.

This example Ranger file

<!-- markdownlint-disable MD033 -->
<img src="https://raw.githubusercontent.com/ben5311/ranger2/main/images/customer.png" alt="Example Ranger file" width="450"/>

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

You design test entities specific to your needs in a `.ranger` file. Then, there are two ways to generate test data:

* Use the Ranger CLI to create CSV or JSONL files.
* Use the JavaScript API to generate JS objects and integrate them into your code.

## Command Line Interface

To setup the Ranger Command Line Interface (CLI), you have two options.

**Option 1**: Download one of the [prebuilt binaries](https://github.com/ben5311/ranger2/releases) (Windows and Linux  only).

**Option 2**: Install [Node.js](https://nodejs.org/) and execute `npm install -g ben5311/ranger2`. #FIXME!

To test it, create new file `Customer.ranger` and paste the following content into the file:

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

Open a Terminal and execute

```bash
ranger Customer.ranger -c 100000 -f jsonl
```

It will generate 100'000 rows and save the output to file `generated/Customer.jsonl`.

```bash
 ██████████████████████████████ 100% | T: 1s | ETA: 0s | 100000/100000
Output file generated successfully: generated/Customer.jsonl
```

## Visual Studio Code

To get editing assistance for `.ranger` files, use the Ranger extension in Visual Studio Code.

### Supported Features

* Auto completion
* Go to definition
* Hover
* Validations
* Quick Fixes
* Code formatting

### Setup

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Install the [Ranger extension](https://marketplace.visualstudio.com/items?itemName=bheimann.ranger).
3. Open a folder in VS Code.
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

This folder contains all necessary files for the VS Code Ranger extension and the CLI.

It's built using the [Langium](https://langium.org/) framework.

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

1. Open the project folder in [VS Code](https://code.visualstudio.com/).
2. Ensure that [Node](https://nodejs.org/en/download/) is installed.
3. Run `npm install` to download all project dependencies.
4. Press `F5` to open a new window with the extension loaded (VS Code Extension Host).
5. Open a file inside `examples` folder or create a new file with file name suffix `.ranger`.
6. Verify that syntax highlighting, validation, completion etc. are working as expected.

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
* Alternatively, you can use VS Code extension [Vitest](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) to run the tests.

### Package

* Run `npm run package:extension` to create a VS Code `.vsix` extension file that can be installed in any VS Code editor.

### To Go Further

Documentation about the Langium framework is available at <https://langium.org/docs>.

Langium GitHub-Repository with lots of sample code: <https://github.com/langium/langium>.
