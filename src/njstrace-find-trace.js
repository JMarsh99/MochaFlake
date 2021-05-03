// format the trace from running mocha
// into a dictionary of code run for each test
// test -> file path -> code range run for that code

// all code ranges are estimates!
// the ranges are all the code between entry and exit
// therefore all branches inbetween but not run will be considered as run!
// further method calls from those branches will not be considered

let fs = require('fs'),
  path = require('path');

let resultsPath = '../results/traceResults.txt';

let {getFileInfo, getFilesInDirectory} = require('./flake-util.js');
/**
* Get the run trace ranges for each file covered by each test
* First, split transform file into individual tests
* Next, get each line covered by trace information
* (in the format test -> file -> [line numbers])
* Then, remove line number duplicates and tranform
* into ranges ([1,2,3,3,8,9,9] -> ['1-3', '8-9'])
*
* @param {Object} options options given in mocha-flake.js
* @return {Object} traceRanges range of lines covered for each file for each test
*/
module.exports = async function findRunTrace(options) {
  // This has to be sync! bad design!
  // Might need to add locks onto file so that file is only read when complete :/
  let fileData = await waitForNoChanges(resultsPath, 600000);
  let tracesLists = transformToTraceLists(fileData);
  let tracesList = tracesLists[0];
  let titleList = tracesLists[1];
  let testFileList = tracesLists[2];
  let traceFileDict =
    getFileTraces(tracesList, titleList, testFileList, options['repoDir']);
  let traceRanges = getFileRanges(traceFileDict);
  return traceRanges;
}

/**
* Take some fileData and return individual traces and their
* corresponding test title
*
* @param{String} fileData file to be processed
* @return {Array} tracesList list of the traces for each test
* @return {Array} titleList list of test titles corresponding to each trace
*/
function transformToTraceLists(fileData) {
  let tracesList = [];
  let titleList = [];
  let testFileList = [];
  // keyword for splitting test runs
  let testTraces = fileData.split('testsplit');
  for (testTrace of testTraces) {
    // split each trace statement for the test
    testTrace = testTrace.split('\n');
    // filter '' strings (lines that only had \n)
    testTrace = testTrace.filter(call => call.trim());
    // if there are any actual elements
    if (testTrace.length != 0){
      // remove the test title and push to array
      let testTitle = testTrace.shift();
      titleList.push(testTitle);
      // get the filename (for multiple test files)
      let testFile = testTrace.shift();
      testFileList.push(testFile);
      // filter and add all return statements
      // these contain all info needed
      // (call statments just repeat part of the info)
      testTrace = testTrace.filter(call => isReturnStatement(call));
      tracesList.push(testTrace);
    }
  }
  return [tracesList, titleList, testFileList];
}

/**
* check if given comma separated String statement contains return
* @param {String} statement string to check for return
* @return {Boolean} true if contained, false otherwise
*/
function isReturnStatement(statement) {
  statement = statement.split(',');
  // in statements of traceResults.txt,
  // the first element is either 'call' or 'return'
  if (statement[0] == 'return'){
    return true;
  }
  else {
    return false;
  }
}

/**
* wrapper for getTraceLines that allows for multiple test files
*
* @param {Array} tracesList array of trace statements for a given test
* @param {Array} titleList array of titles for each test
* @param {Array} testFileList array of the file test is from
* @param {String} pathToRepo path to the repository being tested
*/
function getFileTraces(tracesList, titleList, testFileList, pathToRepo) {
  traceFileDict = {};

  // split title list into specific test files
  // have dictionary point file to tests within that file
  for ([index, testFile] of testFileList.entries()) {
    let currentTrace = tracesList[index];
    let currentTitle = titleList[index];
    if (testFile in traceFileDict) {
      traceFileDict[testFile][0].push(currentTitle);
      traceFileDict[testFile][1].push(currentTrace);
    }
    else {
      traceFileDict[testFile] = [[currentTitle],[currentTrace]];
    }
  }
  // get trace values for each set of files
  for (fileKey in traceFileDict) {
    traceFileDict[fileKey] =
      getTraceLines(
        traceFileDict[fileKey][1],
        traceFileDict[fileKey][0],
        pathToRepo
      );
  }
  return traceFileDict;
}

/**
* Turn each trace statement into a combined list of all covered
* lines for each file for each test
*
* REFERENCE - for each return statement within traceResults
* this is the index:
* 0 -> call or return (always return as filtered in prev. function)
* 1 -> path
* 2 -> function name
* 3 -> function call line
* 4 -> function exit line (return was called)
*
* @param {Array} tracesList array of trace statements for a given test
* @param {Array} titleList array of titles for each test
* @param {String} pathToRepo path to the repository being tested
*
* @return {Object} traceDict 2D dictionary of tests which point to files called
* which then point to the array of lines covered
*/
function getTraceLines(tracesList, titleList, pathToRepo) {
  // from https://stackoverflow.com/questions/54218671/return-object-with-default-values-from-array-in-javascript
  // needed to turn each title into a key for a dictionary
  traceDict = titleList.reduce((acc, key) => ({...acc, [key]: {}}), {});
  for ([index, testTrace] of tracesList.entries()) {
    for (statement of testTrace) {
      // this is the trace for that test
      statement = statement.split(',');
      // convert path to be relative to the repo
      // this makes it easier to compare to nodegit files
      statement[1] = path.normalize(path.relative(pathToRepo, statement[1]));
      let diff = statement[4]-statement[3];
      // get all the individual lines within the range
      // e.g. diff of 3 starting at line 13 becomes 13,14,15
      // this is done so that all ranges can be combined easier later
      let rangeArr =
        Array.from(new Array(diff+1), (x, i) => i+parseInt(statement[3]));
      // if this file is already here, merge with current values
      if (statement[1] in traceDict[titleList[index]]) {
        traceDict[titleList[index]][statement[1]] =
          traceDict[titleList[index]][statement[1]].concat(rangeArr);
      }
      // otherwise just set to the range values
      else {
        traceDict[titleList[index]][statement[1]] = rangeArr;
      }
    }
  }
  return traceDict;
}

/**
* wrapper for getRangesFromTraces to allow for multiple files
*
* @param {Object} traceFileDict dictionary that points from files to traces
*/
function getFileRanges(traceFileDict) {
  for (fileKey in traceFileDict) {
    traceFileDict[fileKey] = getRangesFromTraces(traceFileDict[fileKey]);
  }
  return traceFileDict;
}

/**
* this wraps the getRanges method to prepare the arrays correctly
* by removing duplicates and sorting
*
* @param {Object} traceDict 2D dictionary as returned from getTraceLines
* @return traceDict a transformed traceDict with arrays as described above
*/
function getRangesFromTraces(traceDict) {
  for (traceKey in traceDict) {
    for (pathKey in traceDict[traceKey]) {
      var seen = {};
      // remove duplicates
      traceDict[traceKey][pathKey] = traceDict[traceKey][pathKey].filter(function(item) {
          return seen.hasOwnProperty(item) ? false : (seen[item] = true);
      });
      // sort so that ranges are detected correctly
      traceDict[traceKey][pathKey].sort();
      traceDict[traceKey][pathKey] = getRanges(traceDict[traceKey][pathKey]);
    }
  }
  return traceDict;
}

/**
* given the dictionary with array values in
* convert the single values into range sets
* e.g. [1,2,3,8,9] -> ['1-3', '8-9']
*
* Directly taken from:
* https://stackoverflow.com/questions/2270910/how-to-reduce-consecutive-integers-in-an-array-to-hyphenated-range-expressions
* All credit goes there!
*/
function getRanges(array) {
  var ranges = [], rstart, rend;
  for (var i = 0; i < array.length; i++) {
    rstart = array[i];
    rend = rstart;
    while (array[i + 1] - array[i] == 1) {
      rend = array[i + 1]; // increment the index if the numbers sequential
      i++;
    }
    ranges.push(rstart == rend ? rstart+'' : rstart + '-' + rend);
  }
  return ranges;
}

/**
* Wait for the trace information to be available
* by watching for the testingended file line
* @param {String} filePath path to file to watch for
* @param {Integer} timeout timeout before giving up on retrieving the values
* @return fileInfo full file content
*/
async function waitForNoChanges(filePath, timeout) {
  return new Promise(async function (resolve, reject) {
    // timeout function
    // reject if timeout reached
    var timer = setTimeout(function () {
      watcher.close();
      reject(new Error('Timeout for testResults.json reached'));
    }, timeout);

    let fileInfo;

    // watcher function, fire callback if file changed
    let watcher = fs.watch(filePath, async function(eventType, filename) {
      fileInfo = await getFileInfo(filePath);
      let split = fileInfo.split('\n');
      let last = split[split.length-1];
      if (last == "testingended") {
        clearTimeout(timer);
        watcher.close();
        resolve(fileInfo);
      }
    });

    // Get the info if it's there already
    fileInfo = await getFileInfo(filePath);
    let split = fileInfo.split('\n');
    let last = split[split.length-1];
    if (last == "testingended") {
      clearTimeout(timer);
      watcher.close();
      resolve(fileInfo);
    }
  });
}
