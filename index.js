var Freud = require('freud').Freud,
  config = require('./config.json'),
  md = require('node-markdown').Markdown,
  jade = require('jade'),
  stylus = require('stylus'),
  coffee = require('coffee-script'),
  uncanny = {
    "uncanny": {
      "version": "0.0.1",
      "posts": []
    }
  };

var freud = new Freud(config.source, config.target);

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
  var fn = jade.compile(file.data);
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

freud.go();