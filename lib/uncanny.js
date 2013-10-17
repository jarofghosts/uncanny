var fs = require('fs'),
    path = require('path')
    ejs = require('ejs')

function titlefy(fileName) {
  // Eww, gross. I'm so bad.
  var string = fileName.substring(0, 1).toUpperCase() + fileName.substring(1)
  return string.replace(/-([a-z])/ig, function (all, letter) {
      return ' ' + letter.toUpperCase()
  }).replace(/ Of /g, ' of ').replace(/ And /g, ' and ').replace(/ The /g, ' the ')
    .replace(/ Or /g, ' or ').replace(/ For /g, ' for ').replace(/ To /g, ' to ')
    .replace(/ At /g, ' at ').replace(/ In /g, ' in ').replace(/ A /g, ' a ')
    .replace(/ With /g, ' with ').replace(/ But /g, ' but ').replace(/-/g, ' ')
}

function renderBlogs(uncanny, callback) {
  fs.readFile(uncanny.source + 'blogs/layout.ejs',
    'utf8',
    function (err, template) {
      uncanny.uncanny.blogs.forEach(function (blog) {
        var blogPage = ejs.render(template, {
          filename: path.join(uncanny.source, 'blogs/layout.ejs'),
          uncanny: uncanny.uncanny,
          blog: blog
      })

      fs.writeFileSync(path.join(uncanny.target, 'blogs', blog.name + '.html'), blogPage)
    })
    callback && callback()
  })
}

function rebuildUncanny(uncanny, callback) {
  ['blogs', 'scripts', 'images', 'styles', 'templates'].forEach(function (directory) {
    uncanny.uncanny[directory] = []

    if (directory == 'blogs') {
      fs.readdir(path.join(uncanny.source, directory),
      function (err, files) {
        files.forEach(function (file) {
          var blogDate = file.match(uncanny.blogDateExtract)
          if (blogDate) {
            var blogName = file.replace(uncanny.blogDateRegEx, '').substring(1).replace(/\.md$/i, ''),
              contentRendered = fs.existsSync(path.join(uncanny.target, 'blogs', blogName + '.htm')),
              blogContent = contentRendered ? fs.readFileSync(path.join(uncanny.target, 'blogs', blogName + '.htm'), 'utf8') : '',
              blogObject = {
                year: blogDate[1],
                month: blogDate[2],
                day: blogDate[3],
                name: blogName,
                title: titlefy(blogName),
                target: '/blogs/' + blogName + '.html',
                content: blogContent,
                source: file
              }

            uncanny.uncanny.blogs.push(blogObject);
            if (!contentRendered) {
              renderBlogs(uncanny, function () {
                rebuildUncanny(uncanny)
              })
            }
          }
        })
        uncanny.uncanny.blogs = uncanny.uncanny.blogs.reverse()
        renderBlogs(uncanny)
      })
    } else {
      fs.readdir(path.join(uncanny.target, directory),
      function (err, files) {
        files.forEach(function (file) {
          uncanny.uncanny[directory].push(file);
        })
      })
    }
  })
  callback && callback()
}

function recompile(uncanny, directory, callback) {
  fs.readdir(path.join(uncanny.source, directory), function (err, files) {

    files.forEach(function (file) {
      var targetFile = path.join(uncanny.source, directory, file)
      fs.stat(targetFile, function (err, stats) {
        if (!stats.isDirectory()) {
          uncanny.directories[directory].recompile(file)
        }
      })
    })

    callback && callback(directory)

  })
}

function bootstrap(uncanny, callback) {
  uncanny.customDirs.concat(['blogs', 'scripts', 'styles', 'images', 'templates']).forEach(function (directory) {
    if (!fs.existsSync(path.join(uncanny.source, directory))) fs.mkdirSync(path.join(uncanny.source, directory))
    if (!fs.existsSync(path.join(uncanny.target, directory))) fs.mkdirSync(path.join(uncanny.target, directory))
  })

  callback && callback()
}

function fixBlogName(uncanny, blogName) {
  var blogDate = new Date(),
      month = ('0' + (blogDate.getUTCMonth() + 1)).slice(-2),
      day = ('0' + blogDate.getUTCDate()).slice(-2),
      year = blogDate.getUTCFullYear(),
      newBlogName = [year, month, day, blogName].join('-');
  fs.rename(path.join(uncanny.source, 'blogs', blogName),
      path.join(uncanny.source, 'blogs', newBlogName))
}

exports.fixBlogName = fixBlogName
exports.rebuildUncanny = rebuildUncanny
exports.bootstrap = bootstrap
exports.recompile = recompile
