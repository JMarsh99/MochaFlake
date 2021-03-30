// methods for marking flaky tests with a comment

let fs = require('fs'),
  path = require('path');

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

async function findFlakiesInFiles(fileOverlapInfo) {
  for (fileKey in fileOverlapInfo) {
    fileOverlapInfo[fileKey] =
      await determineFlakyTests(fileOverlapInfo[fileKey], fileKey);
  }
  return fileOverlapInfo;
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
  // we need to watch this!
  // only picks up previous runs!
  let fileInfoJSON = await getFileInfo('../results/testResults.json');
  console.log(fileInfoJSON);
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

// export this to util so it replaces readFileSync :)
/**
* Promisified version of readFile which is simpler to call
* Must be awaited!
*
* @param {String} filePath file path of file to be read
* @return {String} fileInfo file contents in utf-8 format
*/
async function getFileInfo(filePath) {
  const { promisify } = require('util');

  const readFile_promise = promisify(fs.readFile);
  let fileInfo = readFile_promise(filePath, 'utf-8');
  return fileInfo;
}

// export this to util so it replaces readdirSync
/**
* Promisified version of readdir which is simpler to call
* Must be awaited!
* This may only work on one level (no deeper directories)
*
* @param {String} dirPath directory path of files to get
* @return {Array} dirInfo array of each file in the directory
*/
async function getFilesInDirectory(dirPath) {
  const { promisify } = require('util');

  // for some reason readdir function is all lower case?
  const readdir_promise = promisify(fs.readdir);
  let dirInfo = readdir_promise(dirPath);
  return dirInfo;
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
