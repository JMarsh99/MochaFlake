// Utility methods for use within the program
// Currently just file and dir reads

const { promisify } = require('util');
let fs = require('fs');

/**
* Promisified version of readFile which is simpler to call
* Must be awaited!
* Inspired by https://stackoverflow.com/questions/46867517/how-to-read-file-with-async-await-properly
*
* @param {String} filePath file path of file to be read
* @return {String} fileInfo file contents in utf-8 format
*/
let getFileInfo = exports.getFileInfo = async function getFileInfo(filePath) {
  const readFile_promise = promisify(fs.readFile);
  let fileInfo = readFile_promise(filePath, 'utf-8');
  return fileInfo;
}


/**
* Promisified version of readdir which is simpler to call
* Must be awaited!
* Inspired by https://stackoverflow.com/questions/46867517/how-to-read-file-with-async-await-properly
*
* @param {String} dirPath directory path of files to get
* @return {Array} dirInfo array of each file in the directory
*/
exports.getFilesInDirectory = async function getFilesInDirectory(dirPath) {
  // for some reason readdir function is all lower case?
  const readdir_promise = promisify(fs.readdir);
  let dirInfo = readdir_promise(dirPath);
  return dirInfo;
}

/**
* Wait for a file to not be added to for a certain timeout
*
* For contextual use, this is used to wait for the Mocha results to be
* loaded into testResults.json as this is not immediate
*
* This is heavily based on the answer from:
* https://stackoverflow.com/questions/26165725/nodejs-check-file-exists-if-not-wait-till-it-exist
*
* @param {String} filePath path to file to be waited on
* @param {Integer} timeout time before rejecting for taking too long
*/
exports.waitForResults = async function waitForResults(filePath, timeout) {
  return new Promise(async function (resolve, reject) {
    let fileInfo = await getFileInfo(filePath);
    // timeout function
    // reject if timeout reached
    var timer = setTimeout(async function () {
      if (fileInfo == "" || fileInfo == "{}") {
        fileInfo = await getFileInfo(filePath);
        timer = setTimeout(function () {
          watcher.close();
          resolve(fileInfo);
        }, timeout);
      }
      watcher.close();
      resolve(fileInfo);
    }, timeout);

    // watcher function, fire callback if file changed
    let watcher = fs.watch(filePath, async function(eventType, filename) {
      fileInfo = await getFileInfo(filePath);
      clearTimeout(timer);
      timer = setTimeout(function () {
        watcher.close();
        resolve(fileInfo);
      }, timeout);
    });
  });
}
