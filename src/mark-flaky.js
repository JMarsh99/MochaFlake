// methods for marking flaky tests with a comment

let fs = require('fs'),
  path = require('path');

// get the Runner specified in the jscodeshift library
// this allows us to run jscodeshift as if we were
// doing it from command line
let Runner = require('jscodeshift/src/Runner');

/**
* Use jscodeshift runner to add comments to flaky tests
* This is code take from:
* from https://stackoverflow.com/questions/64770181/how-to-run-jscodeshift-from-node-api
*
* @param {Array} testFiles paths to the testFiles
* @param {Array} flakyTests tests to be marked
*/
module.exports = function addFlakyComments(testFiles, flakyTests) {
  //
  /**
   * taken from
   * @link https://github.com/facebook/jscodeshift/blob/48f5d6d6e5e769639b958f1a955c83c68157a5fa/bin/jscodeshift.js#L18
   */
  const jscodeshiftOptions = {
    transform: 'flaky-comment-transformer.js',
    verbose: 0,
    dry: false,
    print: false,
    babel: true,
    extensions: 'js',
    ignorePattern: [],
    ignoreConfig: [],
    runInBand: false,
    silent: true,
    parser: 'babel',
    stdin: false,
    testsToMark: flakyTests
  }
  /**
   * taken from
   * @link https://github.com/facebook/jscodeshift/blob/48f5d6d6e5e769639b958f1a955c83c68157a5fa/bin/jscodeshift.js#L135
   */
  // This will run the transformer code in flaky-comment-transformer.js
  Runner.run(
    /^https?/.test(jscodeshiftOptions.transform) ? jscodeshiftOptions.transform : path.resolve(jscodeshiftOptions.transform),
    testFiles,
    jscodeshiftOptions
  );

}
