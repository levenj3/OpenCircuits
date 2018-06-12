var gulp = require('gulp');
var babel = require('gulp-babel');
var minify = require('gulp-babel-minify'); 
var browserify = require('gulp-browserify');

var concat = require('gulp-concat');
var gap = require('gulp-append-prepend');

var mocha = require('gulp-mocha');

var rename = require('gulp-rename');
var clean = require('gulp-clean');

var argv = require('yargs').argv;


var src = "site/app/public/js/views/Main.js"
var dst = "site/app/public/js";

// JS file locations
var lib = ["libraries/**/*"];
var controller = ["controllers/**/*"];
var model = ["models/*", "models/ioobjects/**/*"];
var view = ["views/*"];
var files = lib.concat(controller, model, view);


var isReleaseBuild = (argv.release === undefined ? false : true);
var buildTests     = (argv.tests === undefined ? false : true);

function devBuild() {    
    return gulp.src(src)
        .pipe(browserify())
        .pipe(rename('combined.js'))
        .pipe(gulp.dest(dst));
}

function releaseBuild() {
    return gulp.src(src)
        .pipe(browserify({
            paths: ['./node_modules','./site/app/public/js/']
        }))
        .pipe(babel({presets: ['es2015']}))
        .pipe(minify())
        .pipe(rename('combined-min.js'))
        .pipe(gulp.dest("."));
}

function testsBuild() {
    var test_paths = "tests/app/public/js/**/*.test.js";
    
    return gulp.src(test_paths)
        .pipe(browserify())
        .pipe(gap.prependText("var jsdom = require('jsdom'); \
                        var { JSDOM } = jsdom; \
                        var window = (new JSDOM(``, { pretendToBeVisual: true })).window; \
                        var document = (window.document);"))
        .pipe(gulp.dest("./tests/bin/public/js"));
}

function test() {
    var test_paths = "tests/bin/public/js/**/*.test.js";
    
    return gulp.src(test_paths)
        .pipe(mocha());
        // .pipe(mocha());
}

if (buildTests)
    gulp.task('build', testsBuild);    
else
    gulp.task('build', (isReleaseBuild ? releaseBuild : devBuild));    
gulp.task('test', test);