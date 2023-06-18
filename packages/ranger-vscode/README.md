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

Find more examples [here](https://github.com/ben5311/ranger2/tree/main/examples).

Find more information about the project [here](https://github.com/ben5311/ranger2#readme).

## Visual Studio Code Extension

The VS Code Extension provides editing assistance (*Intellisense*) for `.ranger` files.

### Supported Features

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
        gender: random("male", "female")
        firstname: map(gender => {
            "male": random("James", "Robert")
            "female": random("Emily", "Lucy")
        })
        lastname: "Parker"
    }
    ```

6. While editing, right click the editor -> click `Ranger: Generate File`.
