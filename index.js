var Freud = require('freud').Freud,
  fs = require('fs'),
  config = require('./config.json'),
  md = require('node-markdown').Markdown,
  jade = require('jade'),
  stylus = require('stylus'),
  coffee = require('coffee-script'),
  sqwish = require('sqwish').minify,
  uglify = require('uglify-js'),
  unlib = require('./lib/uncanny.js'),
  uncanny = {
    "uncanny": {
      "version": "0.0.7",
      "files": []
    },
    "config": config
  },
  ignore = config.ignore || [];

var freud = new Freud(config.source, config.target, {
  "monitorDot": config.watchDotFile,
  "monitorSquiggle": false
});

freud.listen('md', function (file) {
  file.name = file.name.replace(/\.md$/, (config.md || '.htm'));
  file.data = md(file.data);

  return file;
});

freud.listen('coffee', function (file) {
  file.name = file.name.replace(/\.coffee$/, '.js');
  file.data = coffee.compile(file.data);


  return file;
});

freud.listen('jade', function (file) {
  file.name = file.name.replace(/\.jade$/, (config.jade || '.html'));
  var fn = jade.compile(file.data, {
    "filename": config.target + file.name
  });
  file.data = fn(uncanny);

  return file;
});

freud.listen('styl', function (file) {
  file.name = file.name.replace(/\.styl$/, '.css');
  stylus.render(file.data, function (err, css) {
    if (err) { throw err; }

    file.data = file.name.match(/\.min.css$/) ? sqwish(css) : css;

  });

  return file;
});

freud.listen('*:before', function (file) {
  if (!-ignore.indexOf(file.name)) {
    file.write = false;
  }

  return file;
});

freud.listen('*:after', function (file) {
  if (file.name.match(/\.min.js$/)) {
    file.data = uglify.minify(file.data, { fromString: true }).code;
  }

  if (file.name.match(/\.min.css$/)) {
      file.data = sqwish(file.data);
  }

  return file;
});

freud.go();

if (config.syncOnInit) {
  fs.readdir(config.source, function (err, files) {
    if (err) { throw err; }

    files.forEach(function (file) {
      freud.recompile(file);
    });

  });
}

freud.on('compiled', function (filename) {
  var jadeExtension = config.jade || '.html';
  if (!filename.match(/\.html$/)) {
    unlib.rebuildUncanny(uncanny, function () {
      unlib.recompileJade(uncanny, freud);
    });
  }
});

unlib.rebuildUncanny(uncanny);
process.title = config.title || 'uncanny.';