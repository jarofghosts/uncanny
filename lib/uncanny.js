var path = require('path')
  , fs = require('fs')

var ejs = require('ejs')

var smallWords
  , wordsRex

smallWords = [
    'Of'
  , 'And'
  , 'The'
  , 'Or'
  , 'For'
  , 'To'
  , 'At'
  , 'In'
  , 'A'
  , 'With'
  , 'But'
]

var dirs = [
    'blogs'
  , 'scripts'
  , 'images'
  , 'styles'
  , 'templates'
]

wordsRex = new RegExp('\\s+(' + smallWords.join('|') + ')\\s+', 'g')

function titlefy(fileName) {
  var string = fileName.slice(0, 1).toUpperCase() + fileName.slice(1)

  return string.replace(/-([a-z])/ig, upperCase)
    .replace(/-/g, ' ')
    .replace(wordsRex, lowerCase)

  function upperCase(all, letter) {
    return ' ' + letter.toUpperCase()
  }

  function lowerCase(word, p) {
    return ' ' + p.toLowerCase() + ' '
  }
}

function renderBlogs(uncanny, callback) {
  fs.readFile(
      path.join(uncanny.source, 'blogs', 'layout.ejs')
    , 'utf8'
    , render
  )

  function render(err, template) {
    var remaining = uncanny.uncanny.blogs.length

    uncanny.uncanny.blogs.forEach(renderBlog)

    function renderBlog(blog) {
      var blogPage = ejs.render(template, {
          filename: path.join(uncanny.source, 'blogs', 'layout.ejs')
        , uncanny: uncanny.uncanny
        , blog: blog
      })

      fs.writeFile(
          path.join(uncanny.target, 'blogs', blog.name + '.html')
        , blogPage
        , countdown
      )
    }

    function countdown() {
      if(!--remaining && callback) callback()
    }
  }
}

function rebuildUncanny(uncanny, callback) {
  var total = dirs.length

  dirs.forEach(processDir)

  function processDir(directory) {
    uncanny.uncanny[directory] = []

    fs.readdir(
        path.join(uncanny.source, directory)
      , directory === 'blogs' ? loadFiles : addFiles
    )

    function addFiles(err, files) {
      files.forEach(function addFile(file) {
        uncanny.uncanny[directory].push(file)
      })

      finishDir()
    }

    function loadFiles(err, files) {
      var remaining = files.length

      files.forEach(addFile)

      function addFile(file) {
        var blogDate = file.match(uncanny.blogDate)
          , blogContent
          , blogName

        if(!blogDate) return finishFile()

        blogName = file.replace(uncanny.blogDate, '')
            .slice(1)
            .replace(/\.md$/i, '')

        fs.readFile(
            path.join(uncanny.target, 'blogs', blogName + '.htm')
          , updateContent
        )

        function updateContent(err, data) {
          var contentRendered = !err && data
            , blogObject

          blogObject = {
              year: blogDate[1]
            , month: blogDate[2]
            , day: blogDate[3]
            , name: blogName
            , title: titlefy(blogName)
            , target: '/blogs/' + blogName + '.html'
            , content: data || ''
            , source: file
          }

          uncanny.uncanny.blogs.push(blogObject)

          if(contentRendered) return finishFile()

          renderBlogs(uncanny, function () {
            rebuildUncanny(uncanny, finishFile)
          })
        }
      }

      function finishFile() {
        if(!--remaining) finishDir()
      }
    }
  }

  function finishDir() {
    if(!--total) {
      uncanny.uncanny.blogs = uncanny.uncanny.blogs.reverse()
      renderBlogs(uncanny, callback || Function())
    }
  }
}

function recompile(uncanny, directory, callback) {
  fs.readdir(path.join(uncanny.source, directory), readFiles)
  
  function readFiles(err, files) {
    if(err) return console.error(err)

    var remaining = files.length

    files.forEach(filterFiles)

    function filterFiles(file) {
      var targetFile = path.join(uncanny.source, directory, file)

      fs.stat(targetFile, checkFile)

      function checkFile(err, stats) {
        if(!stats.isDirectory()) {
          uncanny.directories[directory].recompile(file)
        }

        if(!--remaining) callback && callback(directory)
      }
    }
  }
}

function bootstrap(uncanny, callback) {
  var allDirs = uncanny.customDirs.concat(dirs)
    , remaining = allDirs.length
  
  allDirs.forEach(makeDir)

  function makeDir(directory) {
    fs.exists(path.join(uncanny.source, directory), checkSource)
    fs.exists(path.join(uncanny.target, directory), checkTarget)

    function checkSource(exists) {
      if(!exists) return countdown()
      fs.mkdir(path.join(uncanny.source, directory), countdown)
    }

    function checkTarget(exists) {
      if(!exists) return countdown()
      fs.mkdir(path.join(uncanny.target, directory), countdown)
    }
  }

  function countdown() {
    if(!--remaining && callback) callback()
  }
}

function fixBlogName(uncanny, blogName) {
  var blogDate = new Date()
    , newBlogName
    , month
    , year
    , day

  month = pad(blogDate.getUTCMonth() + 1)
  day = pad(blogDate.getUTCDate())
  year = blogDate.getUTCFullYear()

  newBlogName = [
      year
    , month
    , day
    , blogName
  ].join('-')

  fs.rename(
      path.join(uncanny.source, 'blogs', blogName)
    , path.join(uncanny.source, 'blogs', newBlogName)
  )
}

function pad(x) {
  return ('0' + x).slice(-2)
}

exports.fixBlogName = fixBlogName
exports.rebuildUncanny = rebuildUncanny
exports.bootstrap = bootstrap
exports.recompile = recompile
