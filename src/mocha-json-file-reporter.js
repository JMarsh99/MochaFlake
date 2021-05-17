// adapted from the JSON reporter given from
// the Mocha github

'use strict';
const fs = require('fs');
const Mocha = require('mocha');
const resultsPath = "../results/testResults.json"
const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_TEST_END,
  EVENT_TEST_PENDING
} = Mocha.Runner.constants;



// this reporter outputs test results, indenting two spaces per suite
// get passes and failures for each test suite
class MyReporter {

  constructor(runner) {
    var tests = [];
    var pending = [];
    var failures = [];
    var passes = [];
    runner.on(EVENT_TEST_PASS, function(test) {
      passes.push(test);
    });
    runner.on(EVENT_TEST_FAIL, function(test) {
      failures.push(test);
    });
    runner.on(EVENT_TEST_PENDING, function(test) {
      pending.push(test);
    });
    runner.once(EVENT_RUN_END, function() {
      var obj = {
        stats: runner.stats,
        pending: pending.map(clean),
        failures: failures.map(clean),
        passes: passes.map(clean)
      };
      fs.readFile(resultsPath, (err, data) => {
        let dataArray = [];
        if (err) throw console.log(err);
        let dataObject;
        try {
          dataObject = JSON.parse(data);
        } catch (err) {
          dataObject = {};
        }
        // if there's already an array, push it to the current array
        if (Object.keys(dataObject).length !== 0) {
          dataArray = dataObject
        }
        dataArray.push(obj);
        fs.writeFile(resultsPath, JSON.stringify(dataArray, null, 2), function (err) {
          if (err) throw console.log(err);
        });
      });
    });
  }
}

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @private
 * @param {Object} test
 * @return {Object}
 */
function clean(test) {
  var err = test.err || {};
  if (err instanceof Error) {
    err = errorJSON(err);
  }

  return {
    title: test.title,
    fullTitle: test.fullTitle(),
    file: test.file,
    duration: test.duration,
    currentRetry: test.currentRetry(),
    speed: test.speed,
    err: cleanCycles(err)
  };
}

/**
 * Replaces any circular references inside `obj` with '[object Object]'
 *
 * @private
 * @param {Object} obj
 * @return {Object}
 */
function cleanCycles(obj) {
  var cache = [];
  return JSON.parse(
    JSON.stringify(obj, function(key, value) {
      if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) {
          // Instead of going in a circle, we'll print [object Object]
          return '' + value;
        }
        cache.push(value);
      }

      return value;
    })
  );
}

/**
 * Transform an Error object into a JSON object.
 *
 * @private
 * @param {Error} err
 * @return {Object}
 */
function errorJSON(err) {
  var res = {};
  Object.getOwnPropertyNames(err).forEach(function(key) {
    res[key] = err[key];
  }, err);
  return res;
}

module.exports = MyReporter;
