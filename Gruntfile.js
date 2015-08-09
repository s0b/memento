module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    // Configurable paths
    var config = {
        app: 'app',
        dist: 'dist',
        manifest: grunt.file.readJSON('app/manifest.json')
    };

    grunt.initConfig({

        // Project settings
        config: config,

        // Watches files for changes and runs tasks based on the changed files
        watch: {
            compass: {
                files: ['<%= config.app %>/styles/{,*/}*.{scss,sass}'],
                tasks: ['compass:chrome']
            },
            gruntfile: {
                files: ['Gruntfile.js']
            },
            json: {
                files: ['<%= config.app %>/{,*/}*.json'],
                tasks: ['copy:chrome']
            },
            scripts: {
                files: ['<%= config.app %>/scripts/{,*/}*.js'],
                tasks: ['copy:chrome']
            },
            html: {
                files: ['<%= config.app %>/{,*/}*.html'],
                tasks: ['copy:chrome']
            },
            img: {
                files: ['<%= config.app %>/{,*/}*.png'],
                tasks: ['copy:chrome']
            }
        },

        // Empties folders to start fresh
        clean: {
            chrome: {},
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '<%= config.dist %>/*',
                        '!<%= config.dist %>/.git*'
                    ]
                }]
            }
        },

        // Make sure code styles are up to par and there are no obvious mistakes
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                '<%= config.app %>/scripts/{,*/}*.js',
                '!<%= config.app %>/scripts/vendor/*',
                'test/spec/{,*/}*.js'
            ]
        },

        // Compiles Sass to CSS and generates necessary files if requested
        compass: {
            options: {
                sassDir: '<%= config.app %>/styles',
                cssDir: '<%= config.dist %>/styles',
                generatedImagesDir: '<%= config.dist %>/images/generated',
                imagesDir: '<%= config.app %>/images',
                javascriptsDir: '<%= config.app %>/scripts',
                fontsDir: '<%= config.app %>/styles/fonts',
                httpImagesPath: '/images',
                httpGeneratedImagesPath: '/images/generated',
                httpFontsPath: '/styles/fonts',
                relativeAssets: false,
                assetCacheBuster: false
            },
            chrome: {
                options: {
                    cssDir: '<%= config.dist %>/styles',
                    generatedImagesDir: '<%= config.dist %>/images/generated',
                    debugInfo: true
                }
            },
            dist: {
                options: {
                    cssDir: '<%= config.dist %>/styles',
                    generatedImagesDir: '<%= config.dist %>/images/generated',
                    environment: 'production'
                }
            }
        },

        // Automatically inject Bower components into the HTML file
        bowerInstall: {
            app: {
                src: [
                    '<%= config.app %>/*.html'
                ]
            },
            sass: {
                src: ['<%= config.app %>/styles/{,*/}*.{scss,sass}'],
                ignorePath: '<%= config.app %>/bower_components/'
            }
        },

        // The following *-min tasks produce minifies files in the dist folder
        imagemin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= config.app %>/images',
                    src: '{,*/}*.{gif,jpeg,jpg,png}',
                    dest: '<%= config.dist %>/images'
                }]
            }
        },

        // Minify HTML
        htmlmin: {
            chrome: {
                files: [{
                    expand: true,
                    cwd: '<%= config.app %>',
                    src: '*.html',
                    dest: '<%= config.dist %>'
                }]
            },
            dist: {
                options: {
                    removeComments: true,
                    removeCommentsFromCDATA: true,
                    collapseWhitespace: true,
                    collapseBooleanAttributes: true,
                    removeAttributeQuotes: true,
                    removeRedundantAttributes: true,
                    useShortDoctype: true,
                    removeEmptyAttributes: true,
                    removeOptionalTags: true
                },
                files: [{
                    expand: true,
                    cwd: '<%= config.app %>',
                    src: '*.html',
                    dest: '<%= config.dist %>'
                }]
            }
        },

        // Copies remaining files to places other tasks can use
        copy: {
            chrome: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= config.app %>',
                    dest: '<%= config.dist %>',
                    src: [
                        '*.{ico,png,txt}',
                        'images/{,*/}*.{webp,gif,jpeg,jpg,png}',
                        '{,*/}*.json',
                        'styles/{,*/}*.css',
                        'scripts/{,*/}*.js',
                        '_locales/{,*/}*.json',
                        '{,*/}*.html'
                    ]
                }]
            },
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= config.app %>',
                    dest: '<%= config.dist %>',
                    src: [
                        '*.{ico,png,txt}',
                        'images/{,*/}*.{webp,gif}',
                        '{,*/}*.json',
                        'styles/{,*/}*.css',
                        'scripts/vendor/{,*/}*.min.js',
                        '_locales/{,*/}*.json',
                    ]
                }]
            }
        },

        // Run some tasks in parallel to speed up build process
        concurrent: {
            chrome: [
                'compass:chrome',
                'htmlmin:chrome'
            ],
            dist: [
                'compass:dist',
                'imagemin',
                'uglify:dist',
                'htmlmin:dist'
            ]
        },

        // Auto buildnumber, exclude debug files. smart builds that event pages
        chromeManifest: {
            dist: {
                options: {
                    buildnumber: 'both',
                    background: {
                        target: 'scripts/background.js'
                    }
                },
                src: '<%= config.app %>',
                dest: '<%= config.dist %>'
            }
        },
        uglify: {
            chrome: {
                options: {
                    beautify: {
                        width: 80,
                        beautify: true
                    }
                },
                files: [{
                    expand: true,
                    cwd: '<%= config.app %>',
                    src: [
                        '**/*.js',
                        '!scripts/vendor/{,*/}*.min.js',
                    ],
                    dest: '<%= config.dist %>'
                }]
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= config.app %>',
                    src: [
                        '**/*.js',
                        '!scripts/vendor/{,*/}*.min.js',
                    ],
                    dest: '<%= config.dist %>'
                }]
            }
        }
    });

    grunt.registerTask('build', [
        'clean:dist',
        'jshint',
        'chromeManifest:dist',
        'concurrent:dist',
        // TODO uglify
        'copy:dist'
    ]);

    grunt.registerTask('default', function() {
        grunt.task.run([
            'clean:dist',
            //'jshint',
            'concurrent:chrome',
            'copy:chrome',
            'watch',
        ]);
    });
};
