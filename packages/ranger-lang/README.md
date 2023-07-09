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

## How does it work?

You design test entities in a `.ranger` file.

Then, there are two ways to generate data:

* Use the [ranger](#command-line-interface) command line tool to create CSV or JSONL files.
* Use the [Node.js library](#nodejs-library) to generate JavaScript objects and use them in your code.

Get editing assistance via the [Visual Studio Code Extension](https://github.com/ben5311/ranger2/tree/main/packages/ranger-vscode#visual-studio-code-extension).

## Command Line Interface

To setup the `ranger` command line tool, you have two options.

### Option 1: Download binary

Download one of the [prebuilt binaries](https://github.com/ben5311/ranger2/releases) (Windows and Linux x86 only).

### Option 2: Install via npm

Install [Node.js](https://nodejs.org/).

Open a terminal and execute

```bash
npm install -g ranger-lang
```

### Test it

Create test file [Customer.ranger](#test-file).

Open a terminal and execute

```bash
ranger Customer.ranger -c 100000 -f jsonl
```

It will generate 100'000 rows and save the output to file `generated/Customer.jsonl`.

## Node.js Library

### Setup

Open a terminal inside the Node.js project folder and execute

```bash
npm install ranger-lang
```

In order to follow the examples below, create the test file [Customer.ranger](#test-file).

### ObjectGenerator API

Create an ObjectGenerator, call `next()` to retrieve the next generated object.

```javascript
import { createObjectGenerator } from 'ranger-lang';

const generator = await createObjectGenerator({ filePath: './Customer.ranger' });

for (let i = 1; i <= 1000; i++) {
    console.log(generator.next());
}
```

### Node.js Streams API

Create a Readable [Node.js Stream](https://nodejs.org/api/stream.html#stream) and pipe it to a Writable Stream.

```javascript
import { createObjectStream } from 'ranger-lang';
import stream from 'stream';

const source = await createObjectStream({ filePath: './Customer.ranger' }, 1000);   // yields 1000 elements

const sink = new stream.Writable({
    objectMode: true,
    write(chunk, _encoding, callback) {
        console.log(chunk);
        callback();
    },
});

stream.pipeline(source, sink, (error) => console.log(error || 'Success!'));
```

## Test file

Create a new file `Customer.ranger` and paste the following content into it:

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
