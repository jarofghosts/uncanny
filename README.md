uncanny.js
====

Generate/compile static files based on file extension. Operates primarily off of `config.json` in the main directory as such:

```js
{
  "source": "/home/coolguy/blog",
  "target": "/var/www/coolguysblog"
}
```

If they don't already exist, the following directories will be created in both `source` and `target`:
+ `blogs/`
+ `styles/`
+ `scripts/`
+ `templates/`

Whenever a file is updated in `source`, the corresponding file will be updated in `target`.

----

#### The blogs/ directory accepts: ####

+ `2015-10-21-blog-name.md` parsed as [Markdown](http://daringfireball.net/projects/markdown/syntax) using [node-markdown](https://github.com/andris9/node-markdown) into HTML (named as `.htm`). The timestamp at the beginning will be used as the date of the post, if a `md` file is saved in the `source/blogs/` directory without a timestamp, uncanny will attempt to rename it to work.
+ `layout.ejs` used to render every blog post into HTML, so you can make it pretty. Output will be `target/blog-name.html`. Available to the layout is the standard `uncanny` object as well as a `blog` object that contains:
- `year`: year of the post,
- `month`: month of the post,
- `day`: numerical day of the post,
- `name`: name of blog (with dashes),
- `title`: title of the blog (generated),
- `target`: location of the file,
- `content`: Markdown-parsed content,
- `source`: filename of original blog

#### The templates/ directory accepts: ####
+ `.ejs` parsed as [ejs](http://embeddedjs.com/) using [ejs' official node module](https://github.com/visionmedia/ejs). Each template is passed the uncanny object containing:
- `version`: current running version of uncanny
- `scripts`, `styles`, `templates`: arrays of filenames from within corresponding directories.
- `blogs`: array of blog objects as described above

#### The scripts/ directory accepts: ####
- `.coffee` parsed as [CoffeeScript](http://coffeescript.org/) using [CoffeeScript's official node module](https://github.com/jashkenas/coffee-script/) into JavaScript.
- File extensions appended with `.min` such as `.min.js` or `.min.coffee` will be run through [UglifyJS](https://github.com/mishoo/UglifyJS2) before being placed in the target.


#### The styles/ directory accepts: ####
* `.styl` parsed as [stylus](http://learnboost.github.io/stylus/) using [stylus' official node module](https://github.com/learnboost/stylus) into CSS.
- File extensions appended with `.min` such as `.min.styl` or `.min.css` will be run through [Sqwish](https://github.com/ded/sqwish) before being placed in the target.

----

Further configuration options include:
* `syncOnInit` to compile and copy all files from the source directory into the target on startup. Default is `false`.
* `watchDotFile` to watch and compile dotfiles.
* `customDirs` an array of additional directories to watch and sync. Currently, files synced via the customDirs config option are not mutated in any way.
* `ignoreCase` to allow for case-insensitive extensions, default is `false`.
* `optimizeImages` to run smush against images in the `images/` directory. Default is `false`
* run with `node index.js quick` to regenerate static files and exit rather than persist and watch directories.

Built on top of [freud](https://github.com/jarofghosts/freud).