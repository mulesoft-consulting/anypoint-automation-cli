const fs   = require('fs');
const path = require('path');

module.exports = {
  getCurrentDirectoryBase : () => {
    return path.basename(process.cwd());
  },

  getFileName : (filePath) => {
    return path.basename(filePath);
  },

  directoryExists : (filePath) => {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch (err) {
      return false;
    }
  },

  readFileAsJSON : (filePath) => {
    var content = fs.readFileSync(filePath)
    return JSON.parse(content)
  },

  readXMLFileAsJSON : (filePath) => {
    var content = fs.readFileSync(filePath)
    return parseStringSync(content)
  },

  fileExists : (filePath) => {
    return fs.existsSync(filePath)
  },

  loadFileAsStream : (filePath) => {
    return fs.createReadStream(filePath)
  }
}

function parseStringSync (str) {
    var result;
    new require('xml2js').Parser().parseString(str, (e, r) => { result = r });
    return result;
};
