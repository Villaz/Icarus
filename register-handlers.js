if(process.env.COVERAGE) {
    require('coffee-coverage').register({
        path: 'abbr',
        basePath: __dirname,
        exclude: ['/test', '/node_modules', '/.git'],
        initAll: true,
        streamlinejs: true
    });
}