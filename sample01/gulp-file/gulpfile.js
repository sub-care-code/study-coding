const { src, dest, watch, lastRun, series, parallel } = require('gulp');
const gulp = { src, dest, watch, lastRun, series, parallel };
const fs = require('fs');
const browserSync = require('browser-sync').create();
const clean = require('gulp-clean');
const ejs = require('gulp-ejs');
const htmlMin = require('gulp-htmlmin');
const prettify = require('gulp-prettify');
const sass = require('gulp-dart-sass');
const postCss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const gcmq = require('gulp-group-css-media-queries');
const cssNano = require('gulp-cssnano');
const babel = require('gulp-babel');
const terser = require('gulp-terser');
const imageMin = require('gulp-imagemin');
const pngQuant = require('imagemin-pngquant');
const mozJpeg = require('imagemin-mozjpeg');
const svgo = require('gulp-svgo');
const webp = require('gulp-webp');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const replace = require('gulp-replace');

const paths = {
  ejs: {
    src: ['./src/ejs/**/*.ejs', '!./src/ejs/**/_*.ejs'],
    dist: './public/',
    watch: './src/ejs/**/*.ejs',
  },
  styles: {
    src: './src/scss/**/*.scss',
    copy: './src/css/vendors/*.css',
    dist: './public/assets/css/',
    distCopy: './public/assets/css/vendors/',
  },
  scripts: {
    src: ['./src/js/**/*.js', '!./src/js/**/vendors/*.js'],
    copy: './src/js/**/vendors/*.js',
    dist: './public/assets/js/',
  },
  images: {
    src: './src/images/**/*.{jpg,jpeg,png,gif,svg}',
    srcWebp: './src/images/**/*.{jpg,jpeg,png}',
    dist: './public/assets/images/',
    distWebp: './public/assets/images/webp/',
  },

  clean: {
    all: './public/',
    assets: ['./public/assets/css/', './public/assets/js/'],
    html: './public/!(assets)**',
    css: './public/assets/css/',
    js: './public/assets/js/',
    images: './public/assets/images/',
  },
};

const ejsCompile = () => {
  const data = JSON.parse(fs.readFileSync('./ejs-config.json'));
  return src(paths.ejs.src)
    .pipe(
      plumber({
        errorHandler: notify.onError('Error: <%= error.message %>'),
      })
    )
    .pipe(ejs(data))
    .pipe(rename({ extname: '.html' }))
    .pipe(
      htmlMin({
        removeComments: false,
        collapseWhitespace: true,
        collapseInlineTagWhitespace: true,
        preserveLineBreaks: true,
      })
    )
    .pipe(
      prettify({
        indent_with_tabs: true,
        indent_size: 2,
      })
    )
    .pipe(replace(/[\s\S]*?(<!DOCTYPE)/, '$1'))
    .pipe(dest(paths.ejs.dist))
    .pipe(browserSync.stream());
};

const sassCompile = () => {
  return src(paths.styles.src, { sourcemaps: true })
    .pipe(
      plumber({
        errorHandler: notify.onError('Error: <%= error.message %>'),
      })
    )
    .pipe(
      sass({
        outputStyle: 'compressed',
        sourcemaps: true,
      }).on('error', sass.logError)
    )
    .pipe(
      postCss([
        autoprefixer({
          cascade: false,
          grid: 'autoplace',
        }),
      ])
    )
    .pipe(gcmq())
    .pipe(cssNano())
    .pipe(
      dest(paths.styles.dist, {
        sourcemaps: './map',
      })
    )
    .pipe(browserSync.stream());
};

const jsCompile = () => {
  return src(paths.scripts.src)
    .pipe(
      plumber({
        errorHandler: notify.onError('Error: <%= error.message %>'),
      })
    )
    .pipe(
      babel({
        presets: ['@babel/preset-env'],
      })
    )
    .pipe(terser())
    .pipe(dest(paths.scripts.dist));
};

const imagesCompress = () => {
  return src(paths.images.src, { since: lastRun(imagesCompress) })
    .pipe(
      plumber({
        errorHandler: notify.onError('Error: <%= error.message %>'),
      })
    )
    .pipe(
      imageMin(
        [
          mozJpeg({
            quality: 80,
          }),
          pngQuant([0.6, 0.8]),
        ],
        {
          verbose: true,
        }
      )
    )
    .pipe(
      svgo({
        plugins: [
          {
            removeViewbox: false,
          },
          {
            removeMetadata: false,
          },
          {
            convertColors: false,
          },
          {
            removeUnknownsAndDefaults: false,
          },
          {
            convertShapeToPath: false,
          },
          {
            collapseGroups: false,
          },
          {
            cleanupIDs: false,
          },
        ],
      })
    )
    .pipe(dest(paths.images.dist));
};

const webpConvert = () => {
  return src(paths.images.srcWebp, { since: lastRun(webpConvert) })
    .pipe(
      plumber({
        errorHandler: notify.onError('Error: <%= error.message %>'),
      })
    )
    .pipe(webp())
    .pipe(dest(paths.images.distWebp));
};

const cssCopy = (done) => {
  fs.readdir(paths.styles.copy, (err, files) => {
    if (err) {
      console.error('Error reading vendors folder:', err);
      done();
      return;
    }

    if (files.length === 0) {
      console.log('No files in vendors folder. Skipping copy.');
      done();
      return;
    }

    src(paths.styles.copy).pipe(dest(paths.styles.distCopy));
    done();
  });
};

const jsCopy = (done) => {
  fs.readdir(paths.scripts.copy, (err, files) => {
    if (err) {
      console.error('Error reading vendors folder:', err);
      done();
      return;
    }

    if (files.length === 0) {
      console.log('No files in vendors folder. Skipping copy.');
      done();
      return;
    }

    src(paths.scripts.copy).pipe(dest(paths.scripts.dist));
    done();
  });
};

const browserSyncFunc = (done) => {
  browserSync.init({
    notify: false,
    server: {
      baseDir: './',
    },
    startPath: './public/index.html',
    reloadOnRestart: true,
  });
  done();
};

const browserReloadFunc = (done) => {
  browserSync.reload();
  done();
};

function cleanAll(done) {
  src(paths.clean.all, { read: false }).pipe(clean());
  done();
}

function cleanHtml(done) {
  src(paths.clean.html, { read: false }).pipe(clean());
  done();
}

function cleanCssJs(done) {
  src(paths.clean.assets, { read: false }).pipe(clean());
  done();
}

function cleanImages(done) {
  src(paths.clean.images, { read: false }).pipe(clean());
  done();
}

const watchFiles = () => {
  watch(paths.ejs.watch, series(ejsCompile, browserReloadFunc));
  watch(paths.styles.src, series(sassCompile));
  watch(paths.styles.copy, series(cssCopy));
  watch(paths.scripts.src, series(jsCompile, browserReloadFunc));
  watch(paths.scripts.copy, series(jsCopy, browserReloadFunc));
  watch(paths.images.src, series(imagesCompress, webpConvert, browserReloadFunc));
};

exports.default = series(
  parallel(ejsCompile, sassCompile, cssCopy, jsCompile, jsCopy, imagesCompress, webpConvert),
  parallel(watchFiles, browserSyncFunc)
);

// その他のコマンド 例： npx gulp cleanAll の形で入力
exports.cleanAll = series(cleanAll);
exports.cleanExcludeHtml = series(cleanHtml);
exports.cleanCssJs = series(cleanCssJs);
exports.cleanImages = series(cleanImages);
