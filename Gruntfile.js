'use strict';
﻿module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-plato');

    grunt.initConfig({
        clean: {
            coverage: {
                src: ['build/']
            }
        },
        copy: {
            coverage: {
                src: ['src/**/*.ts'],
                expand: true,
                dest: 'build/'
           }
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'tap',
                    require: 'coverage/blanket',
                    captureFile: 'results.tap'
                },
                src: ['test/**/*.js']
            },
            coverage: {
                options: {
                    reporter: 'html-cov',
                    quiet: true,
                    captureFile: 'coverage.html'
                },
                src: ['test/**/*.js']
            },
        },
        plato: {
          options: {
            title: 'Icarus',
            jshint: grunt.file.readJSON('.jshintrc'),
          },
          metrics: {
            files: {
              'dist/metrics': [ 'src/**/*.js' ]
            }
          }
        },
        testem: {
          options : {
            launch_in_ci: ['mocha']
          },
          'test/testem.tap': ['test/*']
        },
        shell: {
            compile_ts:{
              command:'tsc'
            },
            install_istanbul:{
              command:'npm -g install istanbul'
            },
            install_yuidoc:{
              command:'npm -g install yuidocjs'
            },
            install_docco:{
              command:'npm install -g docco'
            },
            install_doxx:{
              command:'npm install doxx -g'
            },
            coverage: {
                command: 'istanbul cover node_modules/mocha/bin/_mocha -- -R spec',// --compilers ts:typescript-require',
                options: {
                    stderr: false,
                    execOptions: {
                    cwd: '.'
                  }
                }
            },
          documentation_yuidoc:{
            command:'yuidoc -e .ts src',
          },
          documentation_docco:{
            command:'docco src/*.ts',
          },
          documentation_doxx:{
            command:'doxx --source src --target docs',
          }
        }

    });

    grunt.registerTask('default', ['mochaTest','shell']);
    grunt.registerTask('jenkins', ['shell:compile_ts','shell:create_conf_dir','mochaTest','plato'])
};
