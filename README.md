uncanny
====
----

Generate/compile static files based on file extension. Operates primarily off of `config.json` in the main directory as such:

```js
{
  "source": "/home/coolguy/blog-src",
  "target": "/var/www/coolguysblog"
}
```

Will watch `source` for changes and compile them, then dump them into `target`. Current supported extensions are:
* `.md` parsed as [Markdown](http://daringfireball.net/projects/markdown/syntax) using [node-markdown](https://github.com/andris9/node-markdown) into HTML.
* `.jade` parsed as [jade](http://jade-lang.com/) using [jade's official node module](https://github.com/visionmedia/jade) into HTML.
* `.coffee` parsed as [CoffeeScript](http://coffeescript.org/) using [CoffeeScript's official node module](https://github.com/jashkenas/coffee-script/) into JavaScript.
* `.styl` parsed as [stylus](http://learnboost.github.io/stylus/) using [stylus' official node module](https://github.com/learnboost/stylus) into CSS.

----

Further configuration options include:
* `md` to choose the default file extension for rendered Markdown files. Default is .htm
* `jade` to choose the default file extension for rendered jade files. Default is .html
* `syncOnInit` to compile and copy all files from the source directory into the target on startup. Default is `false`.
* `watchDotFile` to watch and compile dotfiles.

Built on top of [freud](https://github.com/jarofghosts/freud).