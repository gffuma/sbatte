#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const program = require('commander')
const _ = require('lodash')
const moment = require('moment')
const colors = require('colors')

const DB_FILE = path.resolve(__dirname, './data/sbatte.json')
const T = 'YYYY-MM-DD HH:mm'

const readSbatte = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
const writeSbatte = sbatte => fs.writeFileSync(DB_FILE, JSON.stringify(sbatte, null, 2))

const sessionsMinutesSpent = sessions => sessions.reduce((minutes, s) => {
  const start = moment(s.start, T)
  const stop = moment(s.stop, T)
  return minutes + stop.diff(start, 'minutes')
}, 0)

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

    if (sessions.length > 0 && !sessions[sessions.length - 1].stop) {
      console.log('Sbatta alredy started, you must first close it! Sooocio'.red)
      return
    }

    writeSbatte({
      ...sbatte,
      [name]: sessions.concat({ start: moment().format(T) })
    })

    console.log('Sbatta started'.green)
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
