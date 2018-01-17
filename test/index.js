const reshape = require('reshape')
const customElements = require('reshape-custom-elements')
const test = require('ava')
const path = require('path')
const {readFileSync} = require('fs')
const generator = require('..')
const parser = require('reshape-parser')
const fixtures = path.join(__dirname, 'fixtures')

test('basic', (t) => {
  const html = readFileSync(path.join(fixtures, 'basic.html'), 'utf8')
  return reshape({ plugins: customElements(), generator, parser })
    .process(html)
    .then((res) => {
      t.truthy(res.output().trim() === '<p wow="foo" bar="asd">hello world</p>')
    })
})

test('code', (t) => {
  const res = generator([
    {
      type: 'tag',
      name: 'p',
      attrs: { foo: { type: 'text', content: 'bar' } },
      content: [
        { type: 'text', content: 'hello ' },
        { type: 'code', content: 'planet' },
        { type: 'text', content: '!' }
      ]
    }
  ])
  t.truthy(res({ planet: 'world' }) === '<p foo="bar">hello world!</p>')
})

test('comment', (t) => {
  const res = generator([
    {
      type: 'comment',
      content: ' test comment '
    }
  ])
  t.truthy(res() === '<!-- test comment -->')
})

test('ie conditional comment', (t) => {
  const res = generator([
    {
      type: 'comment',
      content: '[if IE]> test ie content <![endif]'
    }
  ])
  t.truthy(res() === '<!--[if IE]> test ie content <![endif]-->')
})

test('runtime', (t) => {
  const runtime = { changeToDoge: (input) => 'doge' }
  const res = generator.call({ runtime }, [
    { type: 'text', content: 'it\'s a ' },
    { type: 'code', content: '__runtime.changeToDoge("cate")' },
    { type: 'text', content: '!' }
  ])
  t.truthy(res() === 'it\'s a doge!')
})

test('customized runtime name', (t) => {
  const runtime = { changeToDoge: (input) => 'doge' }
  const res = generator.call({ runtime }, [
    { type: 'text', content: 'it\'s a ' },
    { type: 'code', content: '__runtime.changeToDoge("cate")' },
    { type: 'text', content: '!' }
  ], { runtimeName: '__funtime__' })
  t.truthy(res() === 'it\'s a doge!')
})

test('return string option', (t) => {
  const res = generator([
    { type: 'text', content: 'hello' }
  ], { returnString: true })
  t.truthy(typeof res === 'string')
  t.truthy(eval(res)() === 'hello') // eslint-disable-line
})

test('runtime with return string', (t) => {
  const res = generator([
    { type: 'code', content: '__runtime.changeToDoge("cate")' }
  ], { returnString: true })
  t.truthy(typeof res === 'string')
  const __runtime = { changeToDoge: (input) => 'doge' } // eslint-disable-line
  t.truthy(eval(res)() === 'doge') // eslint-disable-line
})

test('nested elements', (t) => {
  const res = generator([
    {
      type: 'tag',
      name: 'l1',
      content: [
        {
          type: 'tag',
          name: 'l2',
          content: [
            {
              type: 'tag',
              name: 'l3',
              content: [{ type: 'text', content: 'l3 text' }]
            },
            { type: 'text', content: 'l2 text' }
          ]
        }
      ]
    }
  ])
  t.truthy(res() === '<l1><l2><l3>l3 text</l3>l2 text</l2></l1>')
})

test('self-closing tags', (t) => {
  const res = generator([{ type: 'tag', name: 'br' }])
  t.truthy(res() === '<br>')
})

test('alternate self-closing options', (t) => {
  const brTree = [{ type: 'tag', name: 'br' }]
  const r1 = generator(brTree, { selfClosing: 'slash' })
  const r2 = generator(brTree, { selfClosing: 'tag' })
  const r3 = generator(brTree, { selfClosing: 'close' })

  t.truthy(r1() === '<br />')
  t.truthy(r2() === '<br></br>')
  t.truthy(r3() === '<br>')
})

test('self-closing invalid option', (t) => {
  t.throws(() => generator([], { selfClosing: 'snargle' }), "'snargle' is an invalid option for 'selfClosing'. You can use 'close', 'tag', or 'slash'")
})

test('single attribute', (t) => {
  const res = generator([{
    type: 'tag',
    name: 'div',
    attrs: { id: { type: 'text', content: 'test' } }
  }])
  t.truthy(res() === '<div id="test"></div>')
})

test('multiple attributes', (t) => {
  const res = generator([{
    type: 'tag',
    name: 'div',
    attrs: {
      id: { type: 'text', content: 'test' },
      foo: { type: 'text', content: 'bar' }
    }
  }])
  t.truthy(res() === '<div id="test" foo="bar"></div>')
})

test('boolean attributes', (t) => {
  const res = generator([{
    type: 'tag',
    name: 'input',
    attrs: {
      type: { type: 'text', content: 'checkbox' },
      checked: { type: 'text', content: '' }
    }
  }])
  t.truthy(res() === '<input type="checkbox" checked>')
})

test('code in attribute', (t) => {
  const res = generator([{
    type: 'tag',
    name: 'div',
    attrs: {
      code: { type: 'code', content: 'foo' }
    }
  }])
  t.truthy(res({ foo: 'bar' }) === '<div code="bar"></div>')
})

test('code and string in attribute', (t) => {
  const res = generator([{
    type: 'tag',
    name: 'div',
    attrs: {
      code: [
        { type: 'text', content: 'class-' },
        { type: 'code', content: 'foo' }
      ]
    }
  }])
  t.truthy(res({ foo: 'bar' }) === '<div code="class-bar"></div>')
})

// technically, this would need to be wrapped in parens to be an expression
// but we auto-wrap in the code gen
test('non-expression still works as expected', (t) => {
  const res = generator([{
    type: 'code',
    content: '1 + 1'
  }])
  t.truthy(res() === '2')
})

// not adviseable, but valid
test('tag in attribute', (t) => {
  const res = generator([{
    type: 'tag',
    name: 'div',
    attrs: {
      code: [
        { type: 'tag', name: 'p' }
      ]
    }
  }])
  t.truthy(res() === '<div code="<p></p>"></div>')
})

test('only one code node', (t) => {
  const res = generator([{
    type: 'code',
    content: 'foo'
  }])
  t.truthy(res({ foo: 'bar' }) === 'bar')
})

test('two code nodes in a row', (t) => {
  const res = generator([{
    type: 'code',
    content: 'foo'
  }, {
    type: 'code',
    content: 'wow'
  }])
  t.truthy(res({ foo: 'bar', wow: 'amaze' }) === 'baramaze')
})

test('__nodes code helper', (t) => {
  const res = generator([{
    type: 'code',
    content: 'true ? __nodes[0] : __nodes[1]',
    nodes: [
      { type: 'text', content: 'truth' },
      { type: 'text', content: 'lies' }
    ]
  }])
  const res2 = generator([{
    type: 'code',
    content: 'false ? __nodes[0] : __nodes[1]',
    nodes: [
      { type: 'text', content: 'truth' },
      { type: 'text', content: 'lies' }
    ]
  }])
  t.truthy(res() === 'truth')
  t.truthy(res2() === 'lies')
})

test('scopedLocals option', (t) => {
  const res = generator([{
    type: 'code',
    content: 'locals.foo'
  }], { scopedLocals: true })
  t.truthy(res({ foo: 'bar' }) === 'bar')
})

test('unrecognized node type', (t) => {
  const tree = [{
    type: 'snargle',
    content: 'foo'
  }]
  t.throws(() => generator(tree))
})
