// Utility methods for use within the program
// Currently just file and dir reads

const { promisify } = require('util');
let fs = require('fs');

/**
* Promisified version of readFile which is simpler to call
* Must be awaited!
*
* @param {String} filePath file path of file to be read
* @return {String} fileInfo file contents in utf-8 format
*/
exports.getFileInfo = async function getFileInfo(filePath) {
  const readFile_promise = promisify(fs.readFile);
  let fileInfo = readFile_promise(filePath, 'utf-8');
  return fileInfo;
}


/**
* Promisified version of readdir which is simpler to call
* Must be awaited!
* This may only work on one level (no deeper directories)
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
