// custom formatter for njstrace
// outputs certain information into a file
// this format can then be easily read from
// this is modified from the example custom formatter on the njstrace github

var Formatter = require('njstrace/lib/formatter.js'),
  fs = require('fs'),
  path = require('path');

let testDir = '';
let testDirEnd = '';

// initialise directories to check
function TestFormatter(testDirectory) {
  testDir = testDirectory;
  testDirEnd = path.basename(testDir);
}
// "inherit" from Formatter
require('util').inherits(TestFormatter, Formatter);

// write to trace results
let traceResultsWriter =
  fs.createWriteStream('../results/traceResults.txt', {flags: 'a'});

// Implement the onEntry method
// This code will run when a method is called
TestFormatter.prototype.onEntry = function(args) {
  let parts = args.file.split(path.sep);
  // ignore calls from files in the test directory
  // ignore calls from the file reporter
  // ignore anonymous calls
  if (
    !parts.includes(testDirEnd) &&
    !parts.includes('mocha-json-file-reporter.js') &&
    args.name != '[Anonymous]'
  ) {
    traceResultsWriter.write(
      'call,'+args.file+','+args.name+','+args.line+'\n'
    );
  }
};

// Implement the onExit method
// This code will run when a method is returned or exited
TestFormatter.prototype.onExit = function(args) {
  let parts = args.file.split(path.sep);
  if (
    !parts.includes(testDirEnd) &&
    !parts.includes('mocha-json-file-reporter.js') &&
    args.name != '[Anonymous]'
  ) {
    traceResultsWriter.write(
      'return,'+args.file+','+args.name+','+args.line+','+args.retLine+'\n'
    );
  }
};

module.exports = TestFormatter;
