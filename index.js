var Freud = require('freud').Freud,
  md = require('node-markdown').Markdown,
  config = require('./config.json'),
  jade = require('jade');

var freud = new Freud(config.source, config.target);

freud.listen('md', function (file) {
  file.name = file.name.replace(/\.md$/, '.html');
  file.data = md(file.data);

  return file;
});

freud.go();