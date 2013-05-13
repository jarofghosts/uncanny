var fs = require('fs'),
  ejs = require('ejs');

function titlefy(fileName) {
  // Eww, gross. I'm so bad.
  var string = fileName.substring(0, 1).toUpperCase() + fileName.substring(1);
  return string.replace(/-([a-z])/ig, function (all, letter) {
      return ' ' + letter.toUpperCase();
  });
}

function renderBlogs(uncanny) {
  fs.readFile(uncanny.source + 'blogs/layout.ejs', 'utf8', function (err, template) {
    if (err) { throw err; }
    uncanny.uncanny.blogs.forEach(function (blog) {
      var blogPage = ejs.render(template, {
        filename: uncanny.source + 'blogs/layout.ejs',
        uncanny: uncanny.uncanny,
        blog: blog
      });

      fs.writeFile(uncanny.target + 'blogs/' + blog.name + '.html', blogPage, function (err) {
        if (err) { throw err; }
      });
    });
  });
}

function rebuildUncanny(uncanny, callback) {
  ['blogs', 'scripts', 'styles', 'templates'].forEach(function (directory) {
    uncanny.uncanny[directory] = [];

    if (directory == 'blogs') {
      fs.readdir(uncanny.source + directory, function (err, files) {
        if (err) { throw err; }
        files.forEach(function (file) {
          var blogDate = file.match(uncanny.blogDateExtract);
          if (blogDate) {
            var blogName = file.replace(uncanny.blogDateRegEx, '').substring(1).replace(/\.md$/, '');
            fs.readFile(uncanny.target + 'blogs/' + blogName + '.htm', 'utf8', function (err, blogContent) {
              if (err) { throw err; }

              var blogObject = {
                "year": blogDate[1],
                "month": blogDate[2],
                "day": blogDate[3],
                "name": blogName,
                "title": titlefy(blogName),
                "target": "/blogs/" + blogName + ".html",
                "content": blogContent,
                "source": file
              };

              uncanny.uncanny.blogs.push(blogObject);
            });
          }
        });
        uncanny.uncanny.blogs = uncanny.uncanny.blogs.reverse();
        renderBlogs(uncanny);
      });
    } else {
      fs.readdir(uncanny.target + directory, function (err, files) {
        if (err) { throw err; }
        files.forEach(function (file) {
          uncanny.uncanny[directory].push(file);
        });
      });
    }
  });
  callback && callback();
}

function recompile(uncanny, directory) {
  fs.readdir(uncanny.source + directory, function (err, files) {
    if (err) { throw err; }

    files.forEach(function (file) {
      var targetFile = uncanny.source + directory + (directory !== '' ? '/' + file : file);
      fs.stat(targetFile, function (err, stats) {
        if (!stats.isDirectory()) {
          uncanny.directories[directory].recompile(file);
        }
      });
    });

  });
}

function bootstrap(uncanny, callback) {
  uncanny.customDirs.concat(['blogs', 'scripts', 'styles', 'templates']).forEach(function (directory) {
    if (!fs.existsSync(uncanny.source + directory)) { fs.mkdirSync(uncanny.source + directory); }
    if (!fs.existsSync(uncanny.target + directory)) { fs.mkdirSync(uncanny.target + directory); }
  });

  callback && callback();
}

function fixBlogName(uncanny, blogName) {
  var blogDate = new Date(),
    month = ('0' + (blogDate.getUTCMonth() + 1)).slice(-2),
    day = ('0' + blogDate.getUTCDate()).slice(-2),
    year = blogDate.getUTCFullYear(),
    newBlogName = [year, month, day, blogName].join('-');
  fs.rename(uncanny.source + 'blogs/' + blogName, uncanny.source + 'blogs/' + newBlogName);
}

exports.fixBlogName = fixBlogName;
exports.rebuildUncanny = rebuildUncanny;
exports.bootstrap = bootstrap;
exports.recompile = recompile;