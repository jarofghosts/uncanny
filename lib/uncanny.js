var fs = require('fs'),
  ejs = require('ejs');

function renderBlogs(uncanny) {
  fs.readFile(uncanny.source + 'templates/post.ejs', 'utf8', function (err, template) {
    if (err) { throw err; }
    uncanny.uncanny.blogs.forEach(function (blog) {
      var blogPage = ejs.render(template, {
        filename: uncanny.source + 'templates/post.ejs',
        uncanny: uncanny.uncanny,
        post: blog
      });

      fs.writeFile(uncanny.source + 'posts/' + blog.name + '.html', function (err) {
        if (err) { throw err; }
      });
    });
  });
}

function rebuildUncanny(uncanny, callback) {
  ['blogs', 'scripts', 'styles', 'templates'].forEach(function (directory) {
    uncanny.uncanny[directory] = [];

    if (directory === 'blogs') {
      fs.readdir(uncanny.source + directory, function (err, files) {
        if (err) { throw err; }
        files.forEach(function (file) {
          var blogDate = file.match(uncanny.blogDateExtract);
          if (blogDate) {
            fs.readFile(uncanny.source + 'posts/' + file, 'utf8', function (err, blogContent) {
              if (err) { throw err; }
              var blogName = file.replace(uncanny.blogDateRegEx, '').substring(1).replace(/\.md$/, '');
              var blogObject = {
                "year": blogDate[1],
                "month": blogDate[2],
                "day": blogDate[3],
                "name": blogName,
                "target": "/blogs/" + blogName + ".html",
                "content": blogContent,
                "source": file
              }
              uncanny.uncanny.blogs.push(blogObject);
            });
          }
        });
        uncanny.uncanny.blogs.reverse();
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
  ['blogs', 'scripts', 'styles', 'templates'].forEach(function (directory) {
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