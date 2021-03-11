// run Mocha programmatically with options
// and custom reporter required

let Mocha = require('mocha'),
  fs = require('fs-extra'),
  path = require('path');

let resultsFilePath =  '../results/traceResults.txt';


/**
* runs Mocha programmatically
* @param{Object} options options for Mocha Flake
*/
module.exports = async function runTesting(options) {

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
    traceResultsWriter.write('testsplit\n'+this.currentTest.title+'\n');
  });


  mocha.suite.beforeAll(function () {
    // TODO: make this non-blocking
    // maybe use different flag writestream?
    fs.writeFileSync('../results/traceResults.txt', '');
    // shuffle suites if in options
    if (options['shuffled']) {
      shuffleArray(mocha.suite.suites);
    }
    else {
      // TODO: Make more robust
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

  // Run the tests
  mocha.run(function(failures) {
    // exit with non-zero status if there were failures
    process.exitCode = failures ? 1 : 0;
  });
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
