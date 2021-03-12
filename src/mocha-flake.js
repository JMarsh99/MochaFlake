// entry point for the program
// run all mocha flake with given options and CL params

let inquirer = require('inquirer'),
  path = require('path'),
  fs = require('fs-extra');

let runTesting = require('./mocha-runner.js');
let findNodeDiff = require('./nodegit-find-diff');
let findRunTrace = require('./njstrace-find-trace');

let resultsFilePath =  path.normalize(path.resolve('../results/traceResults.txt'));

// TODO: either use commander or integrate into inquirer
let myArgs = process.argv.slice(2);

// set default options
let options = {
  shuffled: false,
  testOrder: [],
  repoDir: path.normalize(path.resolve(myArgs[0])),
  testDir: path.normalize(path.resolve(myArgs[1]))
};

// ask for test order preference
inquirer.prompt(
  [
    {
      type: 'list',
      name: 'runOrder',
      message: 'What order do you want to run',
      choices: [
        'Standard Order',
        'Input Order',
        'Shuffle Order'
      ]
    }
  ]
).then(answers => {
  if (answers['runOrder'] == 'Input Order') {
    inquirer.prompt(
      {
        type: 'input',
        name: 'runOrder',
        message: 'Input Order (Test order is determined by order in file)'
      }
    ).then(answers => {
      // TODO: validate the answer here
      // currently put in numbers corresponding to each test (not ideal)
      arrayOrder = answers['runOrder'].split(',').map(x => parseInt(x));
      options['testOrder'] = arrayOrder;
      runMochaFlake(options);
    });
  }
  else if (answers['runOrder'] == 'Shuffle Order') {
    // run Mocha with order shuffled
    options['shuffled'] = true;
    runMochaFlake(options);
  }
  else {
    runMochaFlake(options);
  }
});

/**
* Centrally runs all the features of Mocha Flake
* -> get the node diff
* -> run Mocha programmatically
* -> get the runTrace of the program
*
* @param{Object} options options that Mocha Flake was run with
*/
async function runMochaFlake(options) {

  // create file if doesn't already exist
  await fs.ensureFile(resultsFilePath);

  let repoDiff = await findNodeDiff(options);
  await runTesting(options);
  let runTrace = await findRunTrace(options);
  // findDiffTests(repoDiff, runTrace);
}
