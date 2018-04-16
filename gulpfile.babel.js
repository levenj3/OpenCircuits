var gulp = require('gulp');
var uglify = require('gulp-uglify-es').default; 
var concat = require('gulp-concat');
var gap = require('gulp-append-prepend');
var browserify = require('gulp-browserify');
// var mocha = require('gulp-mocha');

var dest = "site/app/public/js/combined.js";
var dest_min = "site/app/public/js/combined-min.js";

var dst = "site/app/public/js/Bundle.js";
var src = "site/app/public/js/views/Main.js";

var lib = ["libraries/**/*"];
var controller = ["controllers/**/*"];
var model = ["models/*", "models/ioobjects/**/*"];
var view = ["views/*"];

var files = lib.concat(controller, model, view);
var paths = files.map(function(file) { return "site/app/public/js/" + file + ".js"; });
var test_paths = files.map(function(file) { return "tests/app/public/js/" + file + ".js"; });

function build() {    
    gulp.src(src)
        .pipe(browserify())
        .pipe(uglify())
        .pipe(concat(dst))
        .pipe(gulp.dest("."));
      
    gulp.src(paths.concat(test_paths))
      .pipe(concat("tests/index.js"))
      .pipe(gap.appendText("start();"))
      .pipe(gulp.dest("."));
}

function test() {
    return gulp.src("tests/index.js")
    .pipe(mocha());
}


gulp.task('build', build);
gulp.task('test', test);