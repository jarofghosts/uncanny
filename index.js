var Freud = require('freud').Freud,
  fs = require('fs'),
  config = require('./config.json'),
  md = require('node-markdown').Markdown,
  jade = require('jade'),
  stylus = require('stylus'),
  coffee = require('coffee-script'),
  uncanny = {
    "uncanny": {
      "version": "0.0.5",
      "files": []
    }
  },
  ignore = config.ignore || [];

var freud = new Freud(config.source, config.target, {
  "monitorDot": config.watchDotFile,
  "monitorSquiggle": false
});

function _rebuildUncanny(callback) {
  fs.readdir(config.source, function (err, files) {
    if (err) { throw err; }

    files.forEach(function (filename) {
      fs.stat(config.source + filename, function (err, stats) {

        var fileObject = {
          "name": filename,
          "stats": stats
        };

        if (filename.match(/\./)) {
          var extension = filename.split('.').pop();
          uncanny.uncanny.files[extension] = uncanny.uncanny.files[extension] || [];
          uncanny.uncanny.files[extension].push(fileObject);
        } else {
          uncanny.uncanny.files['!'] = uncanny.uncanny.files['!'] || [];
          uncanny.uncanny.files['!'].push(fileObject);
        }

        callback();
      });
    });
  });
}

function _recompileJade() {
  fs.readdir(config.source, function (err, files) {
    if (err) { throw err; }

    files.forEach(function (filename) {
      if (filename.match(/\.jade$/) && -ignore.indexOf(filename)) {
        freud.recompile(filename);
      }
    });
  });
}

freud.listen('md', function (file) {
  file.name = file.name.replace(/\.md$/, (config.md || '.htm'));
  file.data = md(file.data);

  return file;
});

freud.listen('coffee', function (file) {
  file.name = file.name.replace(/\.coffee/, '.js');
  file.data = coffee.compile(file.data);

  return file;
});

freud.listen('jade', function (file) {
  file.name = file.name.replace(/\.jade/, (config.jade || '.html'));
  var fn = jade.compile(file.data, {
    "filename": config.target + file.name
  });
  file.data = fn(uncanny);

  return file;
});

freud.listen('styl', function (file) {
  file.name = file.name.replace(/\.styl/, '.css');
  stylus.render(file.data, function (err, css) {
    if (err) { throw err; }

    file.data = css;
  });

  return file;
});

freud.listen('*:before', function (file) {
  if (!-ignore.indexOf(file.name)) {
    file.write = false;
    return file;
  }
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

freud.on('started', function () {
  _rebuildUncanny();
});

freud.on('compiled', function (filename) {
  if (!filename.match(/\.jade$/)) {
    _rebuildUncanny(function () {
      _recompileJade();
    });
  }
});