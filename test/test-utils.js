const fs = require('fs');
const path = require('path');

/**
 * Read fixture data
 *
 * @param {String} fixture - The fixture file
 *
 * @returns {String} - The data from a fixture
 */
function readStreamFor(fixture) {
  return fs.createReadStream(path.normalize(`${__dirname}/fixtures/${fixture}`, 'utf8'));
}

function readFixture(filename) {
  return JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/${filename}`, 'utf8')));
}

module.exports = {
 readStreamFor, readFixture
};
