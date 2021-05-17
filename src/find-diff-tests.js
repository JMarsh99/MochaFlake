// find for each test whether it has covered changed code


/**
* for each test in the runTrace find whether the code run
* has been modified in the last commit
*
* @param {Object} repoDiff dictionary where file paths point to
* corresponding FilePatchInfo objects
* @param {Object} runTrace dictionary where tests point to ranges of lines run
* @return {Object} testChanged dictionary where tests point to a
* boolean value. true -> has been modified, false -> unmodified
*/
module.exports = function findDiffTests(repoDiff, runTrace) {
  for (fileKey in runTrace) {
    for (testKey in runTrace[fileKey]) {
      // if no lines are covered in code during the test (kind of a useless test)
      // automatically set to false
      if (Object.keys(runTrace[fileKey][testKey]).length != 0) {
        runTrace[fileKey][testKey] = findTestChange(runTrace[fileKey][testKey], repoDiff);
      }
      else {
        runTrace[fileKey][testKey] = false;
      }
    }
  }
  return runTrace;
}

/**
* for each path that the test covers, find whether
* the run code ranges overlap with the git modified code
*
* @param {Object} test dictionary where each path points to the range
* of code covered in that file
* @param {Object} repoDiff  dictionary where file paths point to
* corresponding FilePatchInfo objects
* @return {Boolean} true if overlapping, false otherwise
*/
function findTestChange(test, repoDiff) {
  for (path in test) {
    if (path in repoDiff) {
      // this is a method of the FilePatchInfo class
      // gets the range values from header values
      let fileDiffRanges = repoDiff[path].getModRanges();
      // if one overlap is true, we don't need to consider other files
      // as the test still uses modified code
      if (fileDiffRanges.length == 0){
        // if the file has no headers it is uncommited
        // and therefore is all overlap
        return true;
      } else if (rangeOverlap(test[path], fileDiffRanges)) {
        return true;
      }
    }
  }
  return false;
}

/**
* Check whether a range is a single number or a range
* and process accordingly
*
* @param {Array} rangeSet1 set of ranges to compare
* @param {Array} rangeSet2 set of ranges to compare
* @return {Boolean} true if they overlap, false otherwise
*/
function rangeOverlap(rangeSet1, rangeSet2) {
  for (range1 of rangeSet1) {
    for (range2 of rangeSet2) {
      // if it doesn't contain '-' it is a single number
      if (range1.includes('-')) {
        if (doubleRangeCheck(range1, range2)) {
          return true;
        }
      }
      else {
        if (singleRangeCheck(range1, range2)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
* check whether a single number is within the range given
*
* @param {String} number number to see within range
* (still in String form from retrieval)
* @param {String} range range to find whether number is in range
* @return {Boolean} whether number is in range
*/
function singleRangeCheck(number, range) {
  let start1, end1, parsedNumber;
  [start, end] = range.split("-");
  parsedNumber = parseInt(number);
  start = parseInt(start);
  end = parseInt(end);
  if (parsedNumber >= start && parsedNumber <= end) {
    return true;
  }
}

/**
* check whether 2 ranges overlap
*
* @param {String} range1 1st range for checking overlap
* @param {String} range2 2nd range for checking overlap
* @return {Boolean} whether ranges overlap
*/
function doubleRangeCheck(range1, range2) {
  let start1, end1, start2, end2;
  [start1, end1] = range1.split("-");
  [start2, end2] = range2.split("-");
  start1 = parseInt(start1);
  start2 = parseInt(start2);
  end1 = parseInt(end1);
  end2 = parseInt(end2);
  // if overlap, does not matter whether any other overlap
  // if bounds overlap, ranges must overlap
  if (start1 == start2 || start1 == end2 || start2 == end1 || end1 == end2) {
    return true;
  }
  // in this case, the range must lie entirely before the other
  // or they overlap (1st range end is after 2nd range start)
  // or they consume (1st range end is after 2nd range end)
  // consume gives the same outcome as overlap anyways
  else if (start1 < start2){
    if (end1 > start2) {
      return true;
    }
  }
  // in this case, the range must lie entirely after the other
  // or they overlap (1st range start is before 2nd range start)
  else {
    if (start1 < end2) {
      return true;
    }
  }
}
