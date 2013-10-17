#!/usr/bin/env node

var uncanny = require('./lib/main'),
    glance = require('glance'),
    path = require('path'),
    argv = require('optimist')
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
  console.error('Invalid config file.')
  process.exit(1)
}

uncanny.doStart(config, argv)

if (argv.serve) {
  var g = glance.createGlance({
      dir: config.target,
      port: isNaN(Number(argv.serve)) ? 4997 : Number(argv.serve),
      indexing: true,
      nodot: true,
      verbose: true
    }).start()
}
