// run Mocha programmatically with options
// and custom reporter required

let Mocha = require('mocha'),
  fs = require('fs-extra'),
  path = require('path');

let resultsFilePath =  '../results/traceResults.txt';
let TestFormatter = require('./njstrace-formatter');

/**
* runs Mocha programmatically
* @param{Object} options options for Mocha Flake
*/
module.exports = async function runTesting(options) {

  // find relative path to repo tested
  rel = path.relative(process.cwd(), options['repoDir']);

  // get glob patten for relative repo
  var alljs = path.join(rel, '**', '*.js');
  var noNodeMods = '!' + path.join(rel, '**', 'node_modules', '**');
  // inject njstrace to get trace info
  // results in ../results/traceResults.txt
  var njstrace = require('njstrace').inject({
    formatter: new TestFormatter(options['testDir']),
    files: [alljs, noNodeMods]
  })

  var mocha = new Mocha();
  // custom reporter that returns JSON to a specific file
  mocha.reporter('./mocha-json-file-reporter.js');

  let testDir = options['testDir'];
  fs.readdirSync(testDir).filter(function(file) {
      // Only keep the .js files
      return file.substr(-3) === '.js';
  }).forEach(function(file) {
      // add all files from the test path
      mocha.addFile(
          path.join(testDir, file)
      );
  });

  // Open write stream to log to trace file
  let traceResultsWriter =
    fs.createWriteStream(resultsFilePath, {flags: 'a'});

  // Write the test and title to trace file to separate tests
  mocha.suite.beforeEach(function() {
    traceResultsWriter.write(
      'testsplit\n'+
      this.currentTest.title+'\n'+
      path.basename(this.currentTest.file)+'\n'
    );
  });


  mocha.suite.beforeAll(function () {
    fs.writeFileSync('../results/traceResults.txt', '');
    // shuffle suites if in options
    if (options['shuffled']) {
      shuffleArray(mocha.suite.suites);
    }
    else {
      // set the order if given
      let testOrder = options['testOrder'];
      if (testOrder.length > 0) {
        let testArray = [];
        for (position of testOrder) {
          testArray.push(mocha.suite.suites[position-1]);
        }
        mocha.suite.suites = testArray;
      }
    }
  });

  mocha.suite.afterAll(function () {
    traceResultsWriter.write('testingended');
  });

  // allows running of the Mocha test suite multiple times
  mocha.cleanReferencesAfterRun(false);

  // run the mocha instance an amount of times

  fs.writeFileSync('../results/testResults.json', '{}');
  runMochaRecursive(options['retryNumber'], mocha);
}

/**
* run Mocha within the callback until a limit is reached
* this allows for multiple runs of Mocha serially
*
* @param {Integer} limit how many times to run a Mocha instance
* @param {Object} mocha mocha instance to use
* @param {Integer} num optional. Keeps track of the current recursive iteration
*/
function runMochaRecursive(limit, mocha, num = 0) {
  if (num < limit) {
    mocha.run(function(failures) {
      // exit with non-zero status if there were failures
      process.exitCode = failures ? 1 : 0;
      // await file to be written
      runMochaRecursive(limit, mocha, num+1)

    });
  }
  else {
    // dispose of the mocha instance manually
    // (since cleanReferencesAfterRun called)
    // this stops memory leaks!
    mocha.dispose();
  }
}

/**
* from:
* https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
* Implementation of Durstenfeld shuffle
*
* @param{Array} array array to be shuffled
*/
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
