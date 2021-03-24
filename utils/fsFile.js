const fs = require('fs')
const path = require('path')

const baseDir = process.env.PWD
const dataDir = path.resolve(baseDir, 'data')

function writeFile(_file, _content) {
    const pathFile = path.resolve(dataDir, _file)
    fs.appendFileSync(pathFile, _content, err => {
        if (err) {
            console.error(err)
            return
        }
    })
}

function unlinkFile(_file) {
    const pathFile = path.resolve(dataDir, _file)
    fs.unlink(pathFile, (error) => {
        if (error) {
            console.log(error);
            return false;
        }
        console.log('delete error log');
    })
}

module.exports = {
    writeFile,
    unlinkFile
}