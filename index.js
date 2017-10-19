#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const program = require('commander')
const _ = require('lodash')
const moment = require('moment')
const colors = require('colors')
const emoji = require('node-emoji')

const DB_FILE = path.resolve(__dirname, './data/sbatte.json')
const T = 'YYYY-MM-DD HH:mm'

const readSbatte = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
const writeSbatte = sbatte => fs.writeFileSync(DB_FILE, JSON.stringify(sbatte, null, 2))

const sessionsMinutesSpent = sessions => sessions.reduce((minutes, s) => {
  const start = moment(s.start, T)
  const stop = moment(s.stop, T)
  return minutes + stop.diff(start, 'minutes')
}, 0)

const log = (msg = '') => process.stdout.write(`${msg}\n`)

// console.prototype.log = function() {
//   this._stdout.write(util.format.apply(this, arguments) + '\n');
// };
//
// console.log(emoji.get('coffe') + '\n')
log()
log(`${emoji.get('monkey')}    swapick-bug-drago  ${emoji.get('hourglass_flowing_sand')}  140 Min = 2 H 40 Min  ~  (8.00 - <sbatta/>)`.yellow)
log('     Fare storie matte ahahah'.yellow)
log('     #swapick'.yellow)
log()
log(`${emoji.get('zzz')}    ww1`)
log(`${emoji.get('zzz')}    swapick-bug-drago  ${emoji.get('hourglass_flowing_sand')}  140 Min = 2 H 40 Min ~   (8.00 - <sbatta/>) `)
log()
log(`${emoji.get('rocket')}    swapick-bug-drago  ${emoji.get('hourglass_flowing_sand')}  140 Min = 2 H 40 Min ~  (8.00 - 9.00) (10.00 - 11.32) http://workplan.inmagik.com/projects/3/activities/274`.green)
log(`${emoji.get('rocket')}    swapick-bug-drago  ${emoji.get('hourglass_flowing_sand')}  140 Min = 2 H 40 Min ~  (8.00 - 9.00) (10.00 - 11.32)`.green)
log()
// process.stdout.write(`${emoji.get('coffe')}\n`)
// process.stdout.write(emoji.get('rocket')+'\n');


program
  .version('0.1.0')

program
  .command('clear')
  .action(() => {
    writeSbatte({})
    console.log('All sbatte cleared'.green)
  })

program
  .command('start <name>')
  .action((name) => {
    const sbatte = readSbatte()
    const sessions = _.get(sbatte, name, [])

    // if (sessions.length > 0 && !sessions[sessions.length - 1].stop) {
    //   console.log('Sbatta alredy started, you must first close it! Sooocio'.red)
    //   return
    // }
    //
    // writeSbatte({
    //   ...sbatte,
    //   [name]: sessions.concat({ start: moment().format(T) })
    // })

    console.log('\u1F37A')
    // console.log('Sbatta started', emoji.get('coffe'))
  })

program
  .command('stop <name>')
  .action((name) => {
    const sbatte = readSbatte()
    const sessions = _.get(sbatte, name, [])

    if (sessions.length === 0 || (sessions.length > 0 && sessions[sessions.length - 1].stop)) {
      console.log('Before stop a sbatta you must start it! Sooocio'.red)
      return
    }

    writeSbatte({
      ...sbatte,
      [name]: _.update(sessions, `[${sessions.length - 1}]`, s => ({
        ...s,
        stop: moment().format(T),
      }))
    })

    console.log('Sbatta stopped'.green)
  })

program
  .command('list')
  .action(() => {
    const sbatte = readSbatte()

    if (_.keys(sbatte).length === 0) {
      console.log('Zebra sbatte stupid monkey'.yellow)
      return
    }

    _.forEach(sbatte, (sessions, name) => {
      const lastSession = _.last(sessions)
      if (lastSession) {
        if (lastSession.stop) {
          const minutes = sessionsMinutesSpent(sessions)
          console.log(`${name} spent ${minutes} min`)
        } else {
          console.log(`${name} last start at ${lastSession.start}`.green)
        }
      }
    })
  })

program.parse(process.argv)
