// store information about a file patch

module.exports = class FilePatchInfo {
  constructor(fileName, headers){
    this.fileName = fileName;
    this.headers = headers;
  }

  /**
  * get the ranges of modified code for this objects headers
  *
  * @return modRanges an array of ranges in the form "rangeStart-rangeEnd"
  */
  getModRanges(){
    let modRanges = [];
    let currentHeaders = this.headers;
    for (let header of currentHeaders){
      let newLineInfoMatch = header.match(/\+(\d+),(\d+)/);
      modRanges.push(newLineInfoMatch[1]+"-"+newLineInfoMatch[2]);
    }
    return modRanges;
  }
}
