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
const H = 'HH:mm'

const readSbatte = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
const writeSbatte = sbatte => fs.writeFileSync(DB_FILE, JSON.stringify(sbatte, null, 2))

// Status are: sleep, working, done
const STATUS_EMOJI = {
  'sleep': 'zzz',
  'working': 'monkey',
  'done': 'rocket',
}

const updateLast = (list, updater) =>
   _.update(list, `[${list.length - 1}]`, updater)

const sessionsMinutesSpent = sessions => sessions.reduce((minutes, s) => {
  const start = moment(s.start, T)
  const stop = moment(s.stop, T)
  return minutes + stop.diff(start, 'minutes')
}, 0)

const log = (msg = '') => process.stdout.write(`${msg}\n`)
const space = n => _.repeat(' ', n)

const logTable = (rows) => {

  const maxPerCols = _.range(_.get(rows, '[0]', []).length)
    .map(i => _.max(rows.map(row => row[i].length)))

  _.forEach(rows, row => {
    log(_.reduce(row, (out, cell, i) => out + _.padEnd(cell, maxPerCols[i]), ''))
  })
}

program
  .version('0.1.0')

program
  .command('clear')
  .action(() => {
    writeSbatte({})
    log('All sbatte cleared'.green)
  })

program
  .command('start <name>')
  .action((name) => {
    const sbatte = readSbatte()
    const sessions = _.get(sbatte, name, [])

    if (sessions.length > 0 && !sessions[sessions.length - 1].stop) {
      log('Sbatta alredy started, you must first close it! Sooocio'.red)
      return
    }

    writeSbatte({
      ...sbatte,
      [name]: sessions.concat({ start: moment().format(T) })
    })

    log('Sbatta started'.green)
  })

program
  .command('stop <name>')
  .action((name) => {
    const sbatte = readSbatte()
    const sessions = _.get(sbatte, name, [])

    if (sessions.length === 0 || (sessions.length > 0 && sessions[sessions.length - 1].stop)) {
      log('Before stop a sbatta you must start it! Sooocio'.red)
      return
    }

    writeSbatte({
      ...sbatte,
      [name]: _.update(sessions, `[${sessions.length - 1}]`, s => ({
        ...s,
        stop: moment().format(T),
      }))
    })

    log('Sbatta stopped'.green)
  })

program
  .command('list')
  .action(() => {
    const sbatte = _.pickBy(readSbatte(), sessions => sessions.length > 0)

    if (_.keys(sbatte).length === 0) {
      log('Zebra sbatte stupid monkey'.yellow)
      return
    }

    // Make sbatte rows for table
    const rows = _.map(sbatte, (sessions, name) => {
      const lastSession = _.last(sessions)
      const status = lastSession.stop ? 'sleep' : 'working'

      const minutes = status === 'sleep'
        ? sessionsMinutesSpent(sessions)
        // TODO: Fix updateLast must be immutable
        : sessionsMinutesSpent(updateLast([].concat(sessions), s => ({ ...s, stop: moment().format(T) })))

      const sessionsStrs = sessions
        .map(session => {
          const start = moment(session.start, T).format(H)
          const stop = session.stop ? moment(session.stop, T).format(H) : '<sbatta/>'
          return `(${start} - ${stop})`
        })
        .join(' ')

      const color = status === 'working' ? 'yellow' : 'white'

      return [
        emoji.get(STATUS_EMOJI[status]),
        space(2),
        name[color],
        space(2),
        emoji.get('hourglass_flowing_sand'),
        space(2),
        `${minutes} Min`[color],
        ' ~ '[color],
        `${sessionsStrs}`[color],
      ]
    })
    log()
    logTable(rows)
    log()
  })

program.parse(process.argv)
