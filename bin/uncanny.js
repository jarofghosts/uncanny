#!/usr/bin/env node

var path = require('path')

var optimist = require('optimist')
  , glance = require('glance')

var uncanny = require('../')

var argv = optimist
    .usage('Usage: $0 [--dir, d <directory>] [--watch] [--serve [port]]')
    .alias('d', 'dir')
    .string('d')
    .describe('d', 'Use config from <directory>, defaults to cwd')
    .default('d', process.cwd())
    .alias('w', 'watch')
    .boolean('w')
    .describe('w', 'Watch source directory for changes')
    .alias('s', 'serve')
    .describe('s', 'Open a server for your compiled site on [port]')
    .argv

var dir = path.resolve(argv.dir)

try {
  var config = require(path.join(dir, '.uncanny.json'))
} catch (e) {
  console.error(e)
  console.error('Invalid config file.')
  process.exit(1)
}

uncanny(config, argv)

if(argv.serve) {
  glance.createGlance({
      dir: config.target
    , port: argv.serve < 80 ? 4997 : Number(argv.serve)
    , noindex: false
    , nodot: true
    , verbose: false
  }).start()
}
