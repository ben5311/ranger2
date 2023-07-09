# Ranger: A test data generator

Ranger is a test data generator that lets you create customized, correlated test data using the  **Ranger language**.

This example Ranger file

<!-- markdownlint-disable MD033 -->
<img src="https://raw.githubusercontent.com/ben5311/ranger2/main/images/example.png" alt="Example Ranger file" width="450"/>

produces such an output

```json
{"age":37,"sex":"female","name":"Lucy","id":"Lucy123","pin":"1683","eyes":"brown"}
{"age":57,"sex":"male","name":"Robert","id":"Robert123","pin":"4242","eyes":"brown"}
{"age":42,"sex":"female","name":"Lisa","id":"Lisa123","pin":"2016","eyes":"brown"}
{"age":60,"sex":"female","name":"Emily","id":"Emily123","pin":"8119","eyes":"brown"}
{"age":50,"sex":"male","name":"Max","id":"Max123","pin":"4061","eyes":"brown"}
{"age":54,"sex":"male","name":"Robert","id":"Robert123","pin":"5378","eyes":"brown"}
{"age":52,"sex":"female","name":"Emily","id":"Emily123","pin":"4765","eyes":"brown"}
{"age":38,"sex":"male","name":"Robert","id":"Robert123","pin":"8901","eyes":"brown"}
{"age":39,"sex":"female","name":"Emily","id":"Emily123","pin":"6529","eyes":"blue"}
{"age":28,"sex":"male","name":"Max","id":"Max123","pin":"6623","eyes":"brown"}
```

Find more examples [here](https://github.com/ben5311/ranger2/tree/main/examples).

Find more information about the project [here](https://github.com/ben5311/ranger2#readme).

## Visual Studio Code Extension

The VS Code Extension provides editing assistance (*Intellisense*) for `.ranger` files.

### Supported Features

* Syntax highlighting
* Auto completion
* Go to definition
* Hover
* Validations
* Quick Fixes
* Code formatting

### Getting Started

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Install the [Ranger extension](https://marketplace.visualstudio.com/items?itemName=bheimann.ranger-vscode).
3. Open a folder in VS Code.
4. Create a new file `Customer.ranger`.
5. Paste the following content into the file

    ```ranger
    Entity Customer {
        age: random(20..60)
        sex: random("male", "female")
        name: map(sex => [
            random("James", "Robert", "Max"),
            random("Emily", "Lucy", "Lisa"),
        ])
        id: f"{name}123"
        pin: /\d{4}/
        eyes: weighted("brown":80, "blue":20)
    }
    ```

6. While editing, right click the editor -> click `Ranger: Generate File`.
