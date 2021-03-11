// find the current diff from git to the current working tree
// then find the all the headers for each file (none if only added)

let nodegit = require('nodegit'),
  path = require('path');

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
    let patchInfo = await getPatchInfo(pathToRepo);
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
