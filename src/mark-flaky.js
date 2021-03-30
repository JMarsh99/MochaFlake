// methods for marking flaky tests with a comment

let fs = require('fs'),
  path = require('path');

let {getFileInfo, getFilesInDirectory} = require('./flake-util.js');

// get the Runner specified in the jscodeshift library
// this allows us to run jscodeshift as if we were
// doing it from command line
let Runner = require('jscodeshift/src/Runner');


/**
* Get the flaky tests, then mark them with a comment
*
* @param {Object} overlapInfo whether a test overlaps with the diff
* @param {Object} options options run with Mocha Flake
*/
module.exports = async function markFlakies(fileOverlapInfo, options) {
  try {
    let flakyTests = await determineFlakyTests(fileOverlapInfo);
    let testDirFiles = await getFilesInDirectory(options['testDir']);
    // we need to add the full path not just file name
    testDirFiles = testDirFiles.map(fileName => path.join(options['testDir'], fileName));
    await addFlakyComments(testDirFiles, flakyTests);
  } catch(err) {
    console.log(err);
  }
}

/**
* Wait for a JSON file not to be empty (only contain {})
* resolve with contents when file is not empty
*
* For contextual use, this is used to wait for the Mocha results to be
* loaded into testResults.json as this is not immediate
*
* This is heavily based on the answer from:
* https://stackoverflow.com/questions/26165725/nodejs-check-file-exists-if-not-wait-till-it-exist
*
* @param {String} filePath path to file to be waited on
* @param {Integer} timeout time before rejecting for taking too long
*/
async function waitForResults(filePath, timeout) {
  return new Promise(function (resolve, reject) {

    // timeout function
    // reject if timeout reached
    var timer = setTimeout(function () {
      watcher.close();
      reject(new Error('Timeout for results reached! Mocha took too long to get results'));
    }, timeout);

    // watcher function, fire callback if file changed
    let watcher = fs.watch(filePath, async function(eventType, filename) {
      let fileInfo = await getFileInfo(filePath);
      if (fileInfo != "{}") {
        clearTimeout(timer);
        watcher.close();
        resolve(fileInfo);
      }
    });
  });
}

/**
* determine whether a test is flaky based on 2 conditions
* -> The test must have failed
* -> The test must not have been changed in the current
*    working tree
*
* @param {Object} overlapInfo whether a test overlaps with the diff
* @return {Array} testsToBeMarked tests which need are flaky and need
* to be marked with a comment
*/
async function determineFlakyTests(overlapInfo) {
  // we need to wait for the results from Mocha to finish
  // before we retrieve that information
  // timeout set to 10 mins but some projects probably need longer
  // TODO: add user option for timeout?
  let fileInfoJSON = await waitForResults('../results/testResults.json', 600000);

  // turn into js object
  let fileInfo = JSON.parse(fileInfoJSON);
  let testResultsFailures = fileInfo['failures'];
  // from https://stackoverflow.com/questions/54218671/return-object-with-default-values-from-array-in-javascript
  // needed to turn each title into a key for a dictionary
  let testsToBeMarked =
    Object.keys(overlapInfo).reduce((acc, key) => ({...acc, [key]: []}), {});
  if (testResultsFailures.length != 0) {
    for (test of testResultsFailures) {
      let title = test['title'];
      let file = path.basename(test['file']);
      if (!overlapInfo[file][title]) {
        testsToBeMarked[file].push(title);
      }
    }
  }
  return testsToBeMarked;
}

/**
* Use jscodeshift runner to add comments to flaky tests
* This is code take from:
* from https://stackoverflow.com/questions/64770181/how-to-run-jscodeshift-from-node-api
*
* TODO: separate tests to be marked into different files
*
* @param {Array} testFiles paths to the testFiles
* @param {Array} flakyTests tests to be marked
*/
function addFlakyComments(testFiles, flakyTests) {
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
