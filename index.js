var path = require('path')
  , fs = require('fs')

var highlight = require('highlight.js')
  , smushit = require('node-smushit')
  , sqwish = require('sqwish').minify
  , Freud = require('freud').Freud
  , uglify = require('uglify-js')
  , stylus = require('stylus')
  , md = require('marked')
  , ejs = require('ejs')

var unlib = require('./lib/uncanny.js')
  , package = require('./package.json')

var blockRecompile = false
  , freudOptions
  , baseDirs
  , sections
  , uncanny

sections = [
    'blogs'
  , 'scripts'
  , 'styles'
  , 'images'
]

baseDirs = [
    'blogs'
  , 'scripts'
  , 'images'
  , 'styles'
  , 'templates'
  , ''
]

uncanny = {
    baseDirs: baseDirs
  , directories: {}
  , blogDate: /^(\d{4})\-(\d{2})\-(\d{2})/
}

uncanny.uncanny = {
    version: package.version
  , blogs: []
  , scripts: []
  , styles: []
  , templates: []
  , images: []
}

freudOptions = {
    monitorDot: uncanny.watchDot
  , monitorSquiggle: false
  , ignoreCase: uncanny.ignoreCase
}

md.setOptions({
    highlight: highlightCode
  , breaks: true
  , tables: true
})

module.exports = start

function startUncanny() {
  uncanny.customDirs.concat(uncanny.baseDirs).forEach(setupFreud)

  uncanny.directories[''].listen('ejs', renderEJS)
  uncanny.directories.templates.listen('ejs', renderEJS)

  uncanny.directories.blogs.listen('ejs', function noLayout(file) {
    if(file.name === 'layout.ejs') file.write = false

    return false
  })

  uncanny.directories.blogs.listen(['md', 'markdown', 'mkd'], renderMD)
  uncanny.directories.scripts.listen('*:after', minifyScript)
  uncanny.directories.styles.listen(['styl', 'stylus'], renderStylus)
  uncanny.directories.styles.listen('*:after', minifyCSS)

  sections.forEach(setupPost)

  uncanny.directories.templates.on('compiled', triggerBaseRecompile)
  uncanny.directories.templates.on('recompiled', triggerBaseRecompile)

  uncanny.directories.blogs.on('unlinked', unlinkFile)

  uncanny.directories.images.on('copied', smushImage)
  uncanny.directories.images.on('recopied', smushImage)

  uncanny.customDirs.concat(uncanny.baseDirs).forEach(startListeners)

  blockRecompile = true
  uncanny.customDirs.concat(uncanny.baseDirs).forEach(recompileDirs)

  unlib.rebuildUncanny(uncanny, function writeReady() {
    process.stdout.write('ready\n')
  })
}

function start(config, cli) {
  uncanny.source = path.resolve(config.source)
  uncanny.target = path.resolve(config.target)
  uncanny.watchDot = config.watchDotFile
  uncanny.ignoreCase = config.ignoreCase
  uncanny.customDirs = config.customDirs || []
  uncanny.optimizeImages = config.optimizeImages
  uncanny.watch = cli.watch

  unlib.bootstrap(uncanny, startUncanny)

  process.title = config.title || 'uncanny.'
}

function recompileDirs(directory) {
  unlib.recompile(uncanny, directory, recompileDir)

  function recompileDir() {
    if(directory !== '') return

    blockRecompile = false
    if(!uncanny.watch) {
      uncanny.customDirs.concat(uncanny.baseDirs).forEach(stopListeners)
    }
  }
}

function setupFreud(directory) {
  uncanny.directories[directory] = new Freud(
      path.join(uncanny.source, directory)
    , path.join(uncanny.target, directory)
    , freudOptions
  )
}

function unlinkFile(filename) {
  var compiledName = filename.replace(/\.htm/, '.html')

  fs.unlink(path.join(uncanny.target, 'blogs', compiledName), rebuild)
}

function startListeners(directory) {
  uncanny.directories[directory].go()
}

function rebuild(err) {
  if(err) throw err

  unlib.rebuildUncanny(uncanny, recompileTemplates)
}

function smushImage(filename) {
  if(uncanny.optimizeImages) {
    smushit.smushit(path.join(uncanny.target, 'images', filename))
  }
}

function triggerBaseRecompile() {
  if(!blockRecompile) unlib.recompile(uncanny, '')
}

function recompileTemplates() {
  unlib.recompile(uncanny, 'templates')
}

function renderEJS(file) {
  file.name = file.name.replace(/\.ejs$/, '.html')

  file.data = ejs.render(file.data, {
      filename: path.join(uncanny.source, file.name)
    , uncanny: uncanny.uncanny
  })

  return file
}

function renderMD(file) {
  if(!file.name.match(uncanny.blogDate)) {
    unlib.fixBlogName(uncanny, file.name)
    file.write = false

    return file
  }

  file.name = file.name.replace(uncanny.blogDate, '').slice(1)
  file.name = file.name.replace(/\.[^.]+$/, '.htm')
  file.data = md(file.data)

  return file
}

function renderStylus(file) {
  file.name = file.name.replace(/\.styl$/, '.css')
  stylus.render(file.data, setData)

  return file

  function setData(err, css) {
    if(err) throw err
    file.data = css
  }
}

function minifyScript(file) {
  if(file.name.match(/\.min.js$/)) {
    file.data = uglify.minify(file.data, {fromString: true}).code
  }

  return file
}

function minifyCSS(file) {
  if(file.name.match(/\.min.css$/)) file.data = sqwish(file.data)

  return file
}

function setupPost(directory) {
  uncanny.directories[directory].on('compiled', postCompile)
}

function postCompile(filename) {
  unlib.rebuildUncanny(uncanny, recompileTemplates)
}

function stopListeners(directory) {
  uncanny.directories[directory].stop()
}

function highlightCode(code) {
  return highlight.highlightAuto(code).value
}
