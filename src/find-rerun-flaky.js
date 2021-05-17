// determine which tests are flaky from rerun

let fs = require('fs'),
  path = require('path');

let {getFileInfo, waitForResults} = require('./flake-util.js');

let testResultsPath = '../results/testResults.json';

/**
* Determines which tests are flaky from using rerun
* A test is flaky if it passes and fails within all runs
*
* @return flakyMarked A dictionary which stores the title of all flaky tests
* within each file
*/
module.exports = async function findRerunFlakies() {
  try {
    let testResults = await getTestResults();
    let flakyMarked = checkFlaky(testResults);
    return flakyMarked;
  } catch(err) {
    console.log(err);
  }
}

/**
* Get the test results from the file
* Then, organise into tests and push the results for each run
* true -> passed, false -> failed
*
* @return testResults all the results for each test organised by
* file and title
*/
async function getTestResults() {
  let fileInfo = await waitForResults(testResultsPath, 5000);
  let testRuns = JSON.parse(fileInfo);
  let testResults = {};
  for (testRun of testRuns) {
    // run through all passes
    for (test of testRun["passes"]) {
      let file = path.basename(test["file"]);
      let title = test["title"];
      if (!(file in testResults)) {
        testResults[file] = {}
      }
      if (!(title in testResults[file])) {
        testResults[file][title] = [];
      }
      testResults[file][title].push(true);
    }
    // run through all failures
    for (test of testRun["failures"]) {
      let file = path.basename(test["file"]);
      let title = test["title"];
      if (!(file in testResults)) {
        testResults[file] = {}
      }
      if (!(title in testResults[file])) {
        testResults[file][title] = [];
      }
      testResults[file][title].push(false);
    }
  }
  return testResults;
}

/**
* Transform results into whether it should be marked as flaky or not
*
* @return testResults A transformed version of test results which points
* files and tests to whether the test shouls be marked as flaky
*/
function checkFlaky(testResults) {
  for (fileKey in testResults) {
    let markArray = [];
    for (testKey in testResults[fileKey]) {
      let boolResults = testResults[fileKey][testKey];
      // check every element is the same as the first
      let allSame = boolResults.every(item => item === boolResults[0]);
      if (!allSame) {
        markArray.push(testKey);
      }
    }
    testResults[fileKey] = markArray;
  }
  return testResults;
}
