const { rollup } = require('rollup')
const rollupConf = require('./conf')

function build(input, file) {
  const config = Object.assign({}, rollupConf, {
    input, 
    output: {
      file,
      format: 'cjs'
    }
  })
  rollup(config).then(bundle => {
    bundle.write({
      format: 'cjs',
      file
    })
  }).catch(err => console.log(err))
}

build('./src/index.js', './static/index.js')
