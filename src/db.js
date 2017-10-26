const fs = require('fs')
const path = require('path')

const DB_FILE = path.resolve(__dirname, '../data/sbatte.json')

module.exports.readSbatte = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
module.exports.writeSbatte = sbatte => fs.writeFileSync(DB_FILE, JSON.stringify(sbatte, null, 2))
