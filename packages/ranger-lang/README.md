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

Get editing assistance via the [Visual Studio Code Extension](../ranger-vscode/README.md#visual-studio-code-extension).

## Command Line Interface

To setup the `ranger` command line tool, you have two options.

Option 1: Download one of the [prebuilt binaries](https://github.com/ben5311/ranger2/releases) (Windows and Linux x86 only).

Option 2: Install [Node.js](https://nodejs.org/) and execute `npm install -g ranger-lang`.

To test it, create a new file `Customer.ranger` and paste the following content into the file:

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


## JavaScript API

TO BE DONE.
