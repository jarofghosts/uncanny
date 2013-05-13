var Freud = require('freud').Freud,
  fs = require('fs'),
  config = require('./config.json'),
  md = require('node-markdown').Markdown,
  jade = require('jade'),
  stylus = require('stylus'),
  coffee = require('coffee-script'),
  sqwish = require('sqwish').minify,
  uglify = require('uglify-js'),
  ejs = require('ejs'),
  unlib = require('./lib/uncanny.js'),
  uncanny = {
    "uncanny": {
      "version": "0.1.1",
      "blogs": [],
      "scripts": [],
      "styles": [],
      "templates": []
    },
    "source": config.source + (config.source.match(/\/$/) ? '' : '/'),
    "target": config.target + (config.target.match(/\/$/) ? '' : '/'),
    "watchDot": config.watchDotFile,
    "ignore": config.ignore || [],
    "customDirs": config.customDirs || [],
    "directories": {},
    "blogDateRegEx": /^[0-9]{4}\-[0-9]{2}\-[0-9]{2}/,
    "blogDateExtract": /^([0-9]{4})\-([0-9]{2})\-([0-9]{2})/
  };

function startUncanny() {
  uncanny.customDirs.concat(['blogs', 'scripts', 'styles', '', 'templates']).forEach(function (directory) {

    uncanny.directories[directory] =
      new Freud(uncanny.source + directory, uncanny.target + directory, {
        "monitorDot": uncanny.watchDot,
        "monitorSquiggle": false
      });

    uncanny.directories[directory].listen('*:before', function (file) {
      if (!-uncanny.ignore.indexOf(file.name)) {
        file.write = false;
      }

      return file;
    });

  });

  uncanny.directories[''].listen('ejs', function (file) {
    file.name = file.name.replace(/\.ejs$/, '.html');
    file.data = ejs.render(file.data, {
      filename: uncanny.source + file.name,
      uncanny: uncanny.uncanny
    });

    return file;
  });

  uncanny.directories.templates.listen('ejs', function (file) {
    file.name = file.name.replace(/\.ejs$/, '.html');
    file.data = ejs.render(file.data, {
      filename: uncanny.source + 'templates/' + file.name,
      uncanny: uncanny.uncanny
    });

    return file;
  });

  uncanny.directories.blogs.listen('ejs', function (file) {
    if (file.name === 'layout.ejs') {
      file.write = false;
    }

    return false;
  });

  uncanny.directories.blogs.listen(['md', 'markdown', 'mkd'], function (file) {
    if (!file.name.match(uncanny.blogDateRegEx)) {
      unlib.fixBlogName(uncanny, file.name);
      file.write = false;

      return file;
    }
    file.name = file.name.replace(uncanny.blogDateRegEx, '').substring(1);
    file.name = file.name.replace(/\.[^.]+$/, '.htm');
    file.data = md(file.data);

    return file;
  });

  uncanny.directories.scripts.listen('coffee', function (file) {
    file.name = file.name.replace(/\.coffee$/, '.js');
    file.data = coffee.compile(file.data);

    return file;
  });

  uncanny.directories.scripts.listen('*:after', function (file) {
    if (file.name.match(/\.min.js$/)) {
      file.data = uglify.minify(file.data, { fromString: true }).code;
    }

    return file;
  });

  uncanny.directories.styles.listen(['styl', 'stylus'], function (file) {
    file.name = file.name.replace(/\.styl$/, '.css');
    stylus.render(file.data, function (err, css) {
      if (err) { throw err; }
      file.data = css;
    });

    return file;
  });

  uncanny.directories.styles.listen('*:after', function (file) {
    if (file.name.match(/\.min.css$/)) {
      file.data = sqwish(file.data);
    }

    return file;
  });

  ['blogs', 'scripts', 'styles'].forEach(function (directory) {
    uncanny.directories[directory].on('compiled', function (filename) {
      unlib.rebuildUncanny(uncanny, function () {
        unlib.recompile(uncanny, 'templates');
      });
    });
  });

  uncanny.directories.templates.on('compiled', function () {
    unlib.rebuildUncanny(uncanny, function () {
      unlib.recompile(uncanny, '');
    });
  });

  uncanny.directories.templates.on('recompiled', function () {
    unlib.rebuildUncanny(uncanny, function () {
      unlib.recompile(uncanny, '');
    });
  });

  uncanny.directories.blogs.on('unlinked', function (filename) {
    var compiledName = filename.replace(/\.htm/, '.html');
    fs.unlink(uncanny.target + 'blogs/' + compiledName, function (err) {
      if (err) { throw err; }
      unlib.rebuildUncanny(uncanny, function () {
        unlib.recompile(uncanny, 'templates');
      });
    });
  });

  uncanny.customDirs.concat(['blogs', 'scripts', 'styles', '', 'templates']).forEach(function (directory) {
    uncanny.directories[directory].go();
  });

  if (config.syncOnInit) {
    ['blogs', 'scripts', 'styles', 'templates', ''].forEach(function (directory) {
      unlib.recompile(uncanny, directory);
    });
  }

  unlib.rebuildUncanny(uncanny, function () {
    console.log('good to go.');
  });

}

unlib.bootstrap(uncanny, startUncanny);
process.title = config.title || 'uncanny.';