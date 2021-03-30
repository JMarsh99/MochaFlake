// Transformer code for jscodeshift

let path = require('path');

/**
* Transformer used by jscodeshift code in mark-flaky.js
* First checks if comments have already been added,
* if so, remove from list to be marked
* Then, mark the leftover flaky tests
*
* This is mostly based on transformation examples
* on the jscodeshift github
*
* @param {String?} file file to use in transformation
* @param {?} api api to use within transform
* @param {Object} options options run with jscodeshift
*/
module.exports = function (file, api, options) {
  let testFileName = path.basename(file['path'])
  let testsToMark = options['testsToMark'][testFileName];
  const j = api.jscodeshift;

  const comment = j.commentLine(' Suspected flaky test');

  // find comments which match the above
  // if matching, then already marked, skip marking it again
  j(file.source).find(j.Comment).forEach(path => {
    // this is the name of the test that is the parent of the comment
    // (if it exists)
    let parentOfComment = path.parentPath.parentPath.value.expression.arguments[0].value || ''
    if (
      path.value.value == ' Suspected flaky test' &&
      // won't work if test was flaky before but isn't now
      testsToMark.includes(parentOfComment)
    ) {
      // remove if the comment is the one expected and
      // the test is one that is in the tests to mark
      let index = testsToMark.indexOf(parentOfComment);
      testsToMark.splice(index, 1);
    }
  })

  // mark all tests which are in the testsToMark
  return j(file.source)
    .find(j.CallExpression)
    .filter(
      path => {
        if (typeof path.value.arguments[0] !== 'undefined')
          return testsToMark.includes(path.value.arguments[0].value);
        else {
          return false;
        }
      }
    )
    .forEach(p => {
      const comments = p.node.comments = p.node.comments || [];
    	comments.push(comment);
  }).toSource();
}
