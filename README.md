# MochaFlake

This is for a dissertation project at the University of Sheffield. See the disseration for more detail.

This project aims to add some level of flaky test detection and tools for Mocha with Node.js

This includes two methods of flaky test detection:
- Flaky test detection by version control
  - This is done through nodegit and nodegit-kit
  - Also uses njsTrace for tracing details
- Flaky test by rerun

It also allows for running the tests in a given order or a shuffled version of the tests

The tests which are detected as flaky are then marked with a comment that says ("suspected flaky test")

# Running the tool
Once the tool has been downloaded, Node and yarn must be installed as this is what the project uses.

After this, in the highest level directory run
```
yarn
```
and the project dependencies should be installed.

The main class to run is mocha-flake.js in the src folder.

The tool is run with two arguments at command line, not providing these will cause it to error.
The first argument is the path to the repo and the second is the path to the test file to use.

The command line should look like (this was done in Windows terminal):
```
C:\path\to\MochaFlake\src>node mocha-flake.js <path_to_repo> <path_to_testing_folder>
```
For example, if using the TestingRepo provided:
```
C:\path\to\MochaFlake\src>node mocha-flake.js  C:\path\to\TestingRepo C:\path\to\TestingRepo\testMeFolder
```

# Configuring the tool
Inquirer is used to set what parts of the program the user wants to run.
This includes
- Trace+Git which is identification through version control
- Rerun which is identification through rerun
- Whether to use a shuffled order or the order of the tests as normal (standard)

Within mocha-flake.js there is also an options object which is used to set the options. In the future, this would be integrated into the command line but time ran out. For now, the code can be edited to suit the run needs. The options are:
- mode -> this is defaulted to Trace+Git and is overwritten through inquirer
- retryNumber -> this is the number of Mocha runs rerun should perform
- shuffled -> whether this tests are shuffled, also overwritten through inquirer
- repoDir -> directory of the repository
- testDir -> directory of the test directory
- useCurrentWorkingTree -> whether to use past commits or the current working tree for Trace+Git
- branchName -> If using past commits, what branch to use. For older projects, it needs to be set to "master" instead of "main"
- gitCommitToCheck -> Which commit to check when using past commits

