const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const babel = require('rollup-plugin-babel')
const scss = require('rollup-plugin-scss')
const replace = require('rollup-plugin-replace')

module.exports = {
  plugins: [
    resolve({
      preferBuiltins: false,
      jsnext: true,
      main: true,
      browser: true
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.version': JSON.stringify('')
    }),
    babel({
      include: 'src/*.js',
      exclude: 'node_modules/**',
      presets: [
        // ['es2015', { modules: false }],
        ['env',
          {
            'modules': false,
            'targets': {
              'browsers': ['last 2 versions', 'ie 10']
            }
          }
        ],
        'react'
      ],
      plugins: [
        'external-helpers',
        'transform-object-rest-spread'
      ],
      babelrc: false
    }),
    commonjs({
      ignoreGlobal: true
    }),
    scss({
      output: 'static/style.css'
    })
  ]
}