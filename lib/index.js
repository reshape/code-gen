const objfn = require('objectfn')
const addWith = require('with')
const scopedEval = require('./scoped_eval')

// self-closing tags list
const selfClosing = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr']

module.exports = function ReshapeCodeGenerator (tree, options = {}) {
  options.selfClosing = options.selfClosing || 'close'
  options.returnString = options.returnString || false
  options.runtimeName = options.runtimeName || '__runtime'
  options.scopedLocals = options.scopedLocals || false
  options.locals = new Set()

  if (['close', 'tag', 'slash'].indexOf(options.selfClosing) < 0) {
    throw new Error(`'${options.selfClosing}' is an invalid option for 'selfClosing'. You can use 'close', 'tag', or 'slash'`)
  }

  // runtime must be bound with the correct name on eval
  const ctx = {}
  ctx[options.runtimeName] = this.runtime

  // return either a stringified function, or eval'd function
  let js = `"${walk(tree, options)}"`
  js = options.scopedLocals ? `return ${js}` : formatLocals(js, options)
  const func = `;(function (locals) { ${js} })`
  // eval is not as good as, but much faster than node/vm
  return options.returnString ? func : scopedEval(ctx, func)
}

function walk (tree, options) {
  // coerce any input to an array
  tree = Array.prototype.concat(tree)

  return tree.reduce((m, node) => {
    // text node type
    if (node.type === 'text') {
      m += escape(node.content)
      return m
    }

    // tag node type
    if (node.type === 'tag') {
      // open up the tag
      m += `<${node.name}`

      // add attributes if present
      if (node.attrs && Object.keys(node.attrs).length > 0) {
        m += attributes(options, node.attrs)
      }

      // deal with contents and closing tag if applicable
      if (selfClosing.indexOf(node.name) > -1) {
        m += {
          slash: ' />',
          tag: `></${node.name}>`,
          close: '>'
        }[options.selfClosing]
      } else {
        m += '>'
        if (node.content) { m += walk(node.content, options) }
        m += `</${node.name}>`
      }

      return m
    }

    // code node type
    if (node.type === 'code') {
      // handle customizable runtime name

      // When returning a string, runtime is exposed directly. However,
      // when the user is asking for a function back, we need to eval the
      // function, and eval binds internal variables when it runs. In order to
      // avoid scope pollution, we run this eval inside a clean module with
      // variable names that are unlikely to conflict. Since you cannot access
      // local variables' scope in node.js, we nest the runtime one more level.

      let content = options.returnString ? node.content.replace('__runtime', options.runtimeName) : node.content.replace('__runtime', `__reshapeContext.${options.runtimeName}`)
      // handle '__nodes' helper
      content = content.replace(/__nodes\[(\d+)]/g, (match, i) => {
        return `"${walk(node.nodes[i], options)}"`
      })
      m += `" + (${content}) + "`
      return m
    }

    // comment node type
    if (node.type === 'comment') {
      m += `<!-- ${escape(node.content.trim())} -->`
      return m
    }

    // if we haven't matched any of the node types, it's an error
    throw new Error(`Unrecognized node type: ${node.type}\nNode: ${JSON.stringify(node)}\n`)
  }, '')
}

// serialize attributes object into a html attribute string
function attributes (options, obj) {
  return ' ' + objfn.reduce(obj, (m, v, k) => {
    // attribute values can be full trees, so we recurse here
    const resolvedAttr = walk(Array.prototype.concat(v), options)
    // if the value is truthy, we have key/val pair, if not, boolean
    m += resolvedAttr ? `${k}=\\"${resolvedAttr}\\" ` : `${k} `
    return m
  }, '').slice(0, -1)
}

// a very simple character escape
function escape (val) {
  const res = JSON.stringify(val)
  return res.substring(1, res.length - 1)
}

// in order for it to be possible to use function locals like '{{ foo }}'
// instead of '{{ locals.foo }}', they need to be wrapped with some extra code
// to make this possible, provided by the 'with' node module
function formatLocals (js, options) {
  const withWrap = addWith('locals || {}', `res = ${js}`, [options.runtimeName, 'res'])
  return `var res;${withWrap};return res`
}
