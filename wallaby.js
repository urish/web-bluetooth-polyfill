module.exports = function (wallaby) {
    return {
        files: [
            'extension/*.js',
            'tests/*.js',
            { pattern: 'tests/*.spec.js', ignore: true },
        ],

        tests: ['tests/*.spec.js'],

        env: {
            type: 'node',
            runner: 'node'
        },

        testFramework: 'jest'
    };
};
