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
      "version": "0.1.0",
      "blogs": [],
      "scripts": [],
      "styles": [],
      "templates": []
    },
    "source": config.source + (config.source.match(/\/$/) ? '' : '/'),
    "target": config.target + (config.target.match(/\/$/) ? '' : '/'),
    "watchDot": config.watchDotFile,
    "ignore": config.ignore || [],
    "directories": {},
    "blogDateRegEx": /^[0-9]{4}\-[0-9]{2}\-[0-9]{2}/,
  };

function startUncanny() {
  ['blogs', 'scripts', 'styles', 'templates'].forEach(function (directory) {

    uncanny.directories[directory] =
      new Freud(uncanny.source + directory, uncanny.target + directory, {
        "monitorDot": uncanny.watchDot,
        "monitorSquiggle": false
      });

    uncanny.directories[directory].listen('*:before', function (file) {
      if (!-ignore.indexOf(file.name)) {
        file.write = false;
      }

      return file;
    });

  });

  uncanny.directories.templates.listen('ejs', function (file) {
    file.name = file.name.replace(/\.ejs$/, '.html');
    file.data = ejs.render(file.data, { uncanny: uncanny.uncanny });

    return file;
  });

  uncanny.directories.blogs.listen('md', function (file) {
    if (!file.name.match(uncanny.blogDateRegEx)) {
      unlib.fixBlogName(uncanny, file.name);
      file.write = false;
      return file;
    }
    file.name = file.name.replace(uncanny.blogDateRegEx, '');
    file.name = file.name.replace(/\.md$/, '.htm');
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

  uncanny.directories.styles.listen('styl', function (file) {
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

  uncanny.directories.forEach(function (directory) {
    uncanny.directories[directory].go();
  });

}

['blogs', 'scripts', 'styles'].forEach(function (directory) {
  uncanny.directories[directory].on('compiled', function (filename) {
    unlib.rebuildUncanny(uncanny, function () {
      unlib.recompile(uncanny, 'templates');
    });
  });
});

if (config.syncOnInit) {
  ['blogs', 'scripts', 'styles', 'templates'].forEach(function (directory) {
    unlib.recompile(uncanny, directory);
  });
}

unlib.bootstrap(uncanny, startUncanny);
process.title = config.title || 'uncanny.';