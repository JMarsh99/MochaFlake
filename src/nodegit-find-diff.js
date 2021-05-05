// find the current diff from git to the current working tree
// then find the all the headers for each file (none if only added)

let nodegit = require('nodegit'),
  path = require('path'),
  nodegitKit = require("nodegit-kit");

// file patch info class
// stores file path and headers
// can return modified code line ranges
FilePatchInfo = require('./FilePatchInfo');

/**
* get the all FilePatchInfo objects from working directory
* @param{Object} options options run with Mocha Flake
* @return{Object} patchInfo Object which acts like an dictionary,
* keys are paths which match to its FilePatchInfo object
*/
module.exports = async function findNodeDiff(options) {
  try {
    let pathToRepo = options['repoDir'];
    let patchInfo;
    if (options['useCurrentWorkingTree']) {
      patchInfo = await getPatchInfo(pathToRepo);
    } else {
      patchInfo = await getPatchInfoForCommits(pathToRepo);
    }
    return patchInfo;
  } catch(error) {
    console.log(error);
  }
}

/**
* create FilePatchInfo objects from all modified files
* this is done through finding each patched/untracked file
* and finding the headers and paths to them.
* headers are not needed for untracked files as we know
* that all lines are modified
*
* @param{String} pathToRepo path to the target Repository
* @return{Object} repoPatchObjects Object which acts like an dictionary,
* keys are paths which match to its FilePatchInfo object
*/
function getPatchInfo(pathToRepo) {
  return new Promise((resolve, reject) => {
    // open repo through nodegit
    nodegit.Repository.open(pathToRepo).then(repo => {
      // get the Diff between the last commit and the current work directory
      nodegit.Diff.indexToWorkdir(repo, null, {
        flags: nodegit.Diff.OPTION.INCLUDE_UNTRACKED |
               nodegit.Diff.OPTION.RECURSE_UNTRACKED_DIRS
        }).then(diff => {
          // find each patch
          diff.patches().then(async patches => {
            let repoPatchObjects = {};
            // for each patch get the path and headers
            // and turn into FilePatchInfo objects
            for (patch of patches) {
              let patchFile = path.normalize(patch.newFile().path());
              let hunkHeaders = await getHunkHeaders(patch);
              let patchObject = new FilePatchInfo(patchFile, hunkHeaders);
              repoPatchObjects[patchFile] = patchObject;
            };
            resolve(repoPatchObjects);
          });
        });
    });
  });
};

/**
* Gets the diff for the last two commits instead of working tree
* Note: nodegit-kit is used here, this is a module found after the
* above was created
*
* This is adapted from the nodegit-kit README examples
*
* @param {String} pathToRepo path to the repo being tested
*/
async function getPatchInfoForCommits(pathToRepo) {
  return new Promise((resolve, reject) => {
    nodegitKit.open(pathToRepo)
    .then(repo => {
      // Note: branch defaults to master as documented in nodegit-kit
      // This was phased out as in this article:
      // https://www.bbc.co.uk/news/technology-53050955
      // I've set it to use 'main' here
      // maybe add an option for which branch to use?
      return nodegitKit.log(repo, { sort: 'reverse', branch: 'main' })
        .then(history => {
            var commit1 = history[0].commit;
            var commit2 = history[1].commit;
            // git diff <from> <to>
            return nodegitKit.diff(repo, commit1, commit2);
        })
        .then(diff => {
          let repoPatchObjects = {};
          for (diffPart of diff) {
            let diffPath = path.normalize(diffPart['path']);
            let hunkHeaders = [];
            for (hunk of diffPart['hunks']) {
              hunkHeaders.push(hunk.split('\n')[0]);
            }
            let patchObject = new FilePatchInfo(diffPath, hunkHeaders);
            repoPatchObjects[diffPath] = patchObject;
          }
          resolve(repoPatchObjects);
        });
    });
  })
}

/**
* Get the headers for a given patch
* This is separate due to the async nature of getting hunks
*
* @param{Object} currentPatch patch to get headers for
* @return hunkHeaders an array of all headers for the given patch
*/
function getHunkHeaders(currentPatch) {
  return new Promise((resolve, reject) => {
    patch.hunks().then(hunks => {
      let hunkHeaders = [];
      for (hunk of hunks) {
        hunkHeaders.push(hunk.header());
      };
      resolve(hunkHeaders)
    });
  });
}
