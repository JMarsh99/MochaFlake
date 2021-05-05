// entry point for the program
// run all mocha flake with given options and CL params

let inquirer = require('inquirer'),
  path = require('path'),
  fs = require('fs-extra');

let runTesting = require('./mocha-runner.js');
let findNodeDiff = require('./nodegit-find-diff.js');
let findRunTrace = require('./njstrace-find-trace.js');
let findDiffTests = require('./find-diff-tests.js');
let markFlakies = require('./determine-flaky.js');
let findRerunFlakies = require('./find-rerun-flaky');
let addFlakyComments = require('./mark-flaky');

let resultsFilePath =  path.normalize(path.resolve('../results/traceResults.txt'));

// TODO: either use commander or integrate into inquirer
let myArgs = process.argv.slice(2);

// set default options
let options = {
  mode: 'Trace+Git',
  retryNumber: 1,
  shuffled: false,
  testOrder: [],
  repoDir: path.normalize(path.resolve(myArgs[0])),
  testDir: path.normalize(path.resolve(myArgs[1])),
  useCurrentWorkingTree: false
};

// ask for test mode preference
inquirer.prompt(
  [
    {
      type: 'list',
      name: 'runMode',
      message: 'What mode do you want to run',
      choices: [
        'Trace+Git',
        'Rerun',
        'Both'
      ]
    }
  ]
).then(answers => {
  // ask whether test order should be shuffled
  options['mode'] = answers['runMode'];
  if (options['mode'] == 'Rerun') {
    options['retryNumber'] = 2;
   }
  inquirer.prompt(
    [
      {
        type: 'list',
        name: 'runOrder',
        message: 'What order do you want to run',
        choices: [
          'Standard Order',
          'Shuffle Order'
        ]
      }
    ]
  ).then(answers => {
    if (answers['runOrder'] == 'Shuffle Order') {
      // run Mocha with order shuffled
      options['shuffled'] = true;
      runMochaFlake(options);
    }
    else {
      runMochaFlake(options);
    }
  });
});

/**
* Centrally runs all the features of Mocha Flake
*
* For Trace+Git
* -> get the node diff
* -> run Mocha programmatically
* -> get the runTrace of the program
* -> find whether the diff and runTrace overlap
* -> if that test fails and there is no diff overlap,
*    mark as flaky
*
* For Rerun
* -> run Mocha programmatically with retryNumber option,
     this will rerun the Mocha test suite multiple times
* -> Collect information about the test runs
* -> Determine which tests both pass and fail and mark them as flaky
* @param{Object} options options that Mocha Flake was run with
*/
async function runMochaFlake(options) {

  // create file if doesn't already exist
  await fs.ensureFile(resultsFilePath);

  if (options['mode'] == 'Trace+Git') {
    console.log('Running njsTrace with nodegit')
    try {
      let repoDiff = await findNodeDiff(options);
      await runTesting(options);
      let runTrace = await findRunTrace(options);
      let diffTests = findDiffTests(repoDiff, runTrace);
      markFlakies(diffTests, options);
    } catch(err){
      console.log(err);
    }
  } else if (options['mode'] == 'Rerun') {
    try {
      await runTesting(options);
      let rerunFlakies = await findRerunFlakies();
      let markFlag = false;
      for (fileKey in rerunFlakies) {
        // run the rest only if there are flaky tests
        if (rerunFlakies[fileKey].length > 0) {
          markFlag = true;
        }
      }
      if (markFlag) {
        let testDirFiles = Object.keys(rerunFlakies).map(
          fileName => path.join(options['testDir'], fileName)
        );
        addFlakyComments(testDirFiles, rerunFlakies);
      }

    } catch(err) {
      console.log(err);
    }
  } else {
    console.log('Not implemented yet :/');
  }
}
