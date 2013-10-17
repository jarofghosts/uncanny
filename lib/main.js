var Freud = require('freud').Freud,
    fs = require('fs'),
    path = require('path'),
    md = require('marked'),
    stylus = require('stylus'),
    coffee = require('coffee-script'),
    sqwish = require('sqwish').minify,
    uglify = require('uglify-js'),
    ejs = require('ejs'),
    unlib = require('./uncanny.js'),
    package = require('../package.json')
    smushit = require('node-smushit'),
    blockRecompile = false,
    uncanny = {
      uncanny: {
        version: package.version,
        blogs: [],
        scripts: [],
        styles: [],
        templates: [],
        images: []
      },
      baseDirs: ['blogs', 'scripts', 'images', 'styles', 'templates', ''],
      directories: {},
      blogDateRegEx: /^[0-9]{4}\-[0-9]{2}\-[0-9]{2}/,
      blogDateExtract: /^([0-9]{4})\-([0-9]{2})\-([0-9]{2})/
    }
exports.doStart = doStart

function smushImage(filename) {
  if (uncanny.optimizeImages) {
    smushit.smushit(path.join(uncanny.target, 'images', filename))
  }
}

function triggerBaseRecompile() {
  if (!blockRecompile) unlib.recompile(uncanny, '')
}

function startUncanny() {
  uncanny.customDirs.concat(uncanny.baseDirs).forEach(function (directory) {

    uncanny.directories[directory] =
      new Freud(path.join(uncanny.source, directory),
        path.join(uncanny.target, directory), {
        monitorDot: uncanny.watchDot,
        monitorSquiggle: false,
        ignoreCase: uncanny.ignoreCase
      })

  })

  uncanny.directories[''].listen('ejs', function (file) {
    file.name = file.name.replace(/\.ejs$/, '.html')
    file.data = ejs.render(file.data, {
      filename: path.join(uncanny.source, file.name),
      uncanny: uncanny.uncanny
    })

    return file
  })

  uncanny.directories.templates.listen('ejs', function (file) {
    file.name = file.name.replace(/\.ejs$/, '.html')
    file.data = ejs.render(file.data, {
      filename: path.join(uncanny.source, 'templates', file.name),
      uncanny: uncanny.uncanny
    })

    return file
  })

  uncanny.directories.blogs.listen('ejs', function (file) {
    if (file.name === 'layout.ejs') file.write = false

    return false
  })

  uncanny.directories.blogs.listen(['md', 'markdown', 'mkd'], function (file) {
    if (!file.name.match(uncanny.blogDateRegEx)) {
      unlib.fixBlogName(uncanny, file.name)
      file.write = false

      return file
    }
    file.name = file.name.replace(uncanny.blogDateRegEx, '').substring(1)
    file.name = file.name.replace(/\.[^.]+$/, '.htm')
    file.data = md(file.data)

    return file
  })

  uncanny.directories.scripts.listen('coffee', function (file) {
    file.name = file.name.replace(/\.coffee$/, '.js')
    file.data = coffee.compile(file.data)

    return file
  })

  uncanny.directories.scripts.listen('*:after', function (file) {
    if (file.name.match(/\.min.js$/)) {
      file.data = uglify.minify(file.data, { fromString: true }).code
    }

    return file
  })

  uncanny.directories.styles.listen(['styl', 'stylus'], function (file) {
    file.name = file.name.replace(/\.styl$/, '.css')
    stylus.render(file.data, function (err, css) {
      if (err) throw err
      file.data = css
    })

    return file
  })

  uncanny.directories.styles.listen('*:after', function (file) {
    if (file.name.match(/\.min.css$/)) file.data = sqwish(file.data)

    return file
  })

  ['blogs', 'scripts', 'styles', 'images'].forEach(function (directory) {
    uncanny.directories[directory].on('compiled', function (filename) {
      unlib.rebuildUncanny(uncanny, function () {
        unlib.recompile(uncanny, 'templates')
      })
    })
  })

  uncanny.directories.templates.on('compiled', triggerBaseRecompile)
  uncanny.directories.templates.on('recompiled', triggerBaseRecompile)

  uncanny.directories.blogs.on('unlinked', function (filename) {
    var compiledName = filename.replace(/\.htm/, '.html')
    fs.unlink(path.join(uncanny.target, 'blogs', compiledName),
      function (err) {
        if (err) throw err
        unlib.rebuildUncanny(uncanny, function () {
          unlib.recompile(uncanny, 'templates')
        })
      })
  })

  uncanny.directories.images.on('copied', smushImage)
  uncanny.directories.images.on('recopied', smushImage)

  uncanny.customDirs.concat(uncanny.baseDirs).forEach(function (directory) {
    uncanny.directories[directory].go()
  })

  if (config.syncOnInit) {
    blockRecompile = true
    uncanny.customDirs.concat(uncanny.baseDirs).forEach(function (directory) {
      unlib.recompile(uncanny, directory, function () {
        if (directory === '') {
          blockRecompile = false
          if (!uncanny.watch) {
            uncanny.customDirs.concat(uncanny.baseDirs).forEach(stopListeners)
          }
        }
      })
    })
    function stopListeners (directory) {
      uncanny.directories[directory].stop()
    }
  }

  unlib.rebuildUncanny(uncanny, function () {
    console.log('rebuilt')
  })

}
function doStart(config, cli) {
  uncanny.source = path.resolve(config.source)
  uncanny.target = path.resolve(config.source)
  uncanny.watchDot = config.watchDotFile
  uncanny.ignoreCase = config.ignoreCase
  uncanny.customDirs = config.customDirs || []
  uncanny.optimizeImages = config.optimizeImages
  uncanny.watch = cli.watch

  unlib.bootstrap(uncanny, startUncanny)
  process.title = config.title || 'uncanny.'
}
