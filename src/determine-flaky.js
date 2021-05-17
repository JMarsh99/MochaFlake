// methods for getting the required info to pass to decide
// which flaky methods to mark

let fs = require('fs'),
  path = require('path');

let {getFileInfo, getFilesInDirectory, waitForResults} = require('./flake-util.js');

let addFlakyComments = require('./mark-flaky.js');

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
  let fileInfoJSON = await waitForResults('../results/testResults.json', 5000);
  // turn into js object
  let fileInfo = "";
  try {
    fileInfo = JSON.parse(fileInfoJSON);
  } catch (err) {
    // occasionally, this method misses
    // add a retry so that it gets the info correctly
    console.log("Missed file info, retrying...");
    // add extra time (2sec) so that it's close to guaranteed to hit
    fileInfoJSON = await waitForResults('../results/testResults.json', 7000);
    fileInfo = JSON.parse(fileInfoJSON);
  }
  // since it's the only run, just get the first value
  fileInfo = fileInfo[0];
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
