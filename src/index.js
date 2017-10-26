#!/usr/bin/env node

const path = require('path')
// Load env file from root project folder
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const Promise = require('promise')
const fs = require('fs')
const program = require('commander')
const moment = require('moment')
const colors = require('colors')
const emoji = require('node-emoji')
const inquirer = require('inquirer')
const { exec } = require('child_process')
const _ = require('lodash')
const api = require('./api')
const { DB_FILE, readSbatte, writeSbatte } = require('./db')
const {
  T, M, H,
  sessionsMinutesSpent,
  touchStop,
  updateLast,
  getSbattaStatus
} = require('./utils')

const WEB_URL = process.env.ROOT_URL

// Status are: sleep, working, done, pushed
const STATUS_EMOJI = {
  'sleep': 'zzz',
  'working': 'monkey',
  'done': 'thumbsup',
  'pushed': 'rocket',
}
const STATUS_COLORS = {
  'sleep': 'white',
  'working': 'yellow',
  'done': 'blue',
  'pushed': 'green',
}

const log = (msg = '') => process.stdout.write(`${msg}\n`)
const space = (n = 1) => _.repeat(' ', n)

const logTable = (rows) => {

  const maxPerCols = _.range(_.get(rows, '[0]', []).length)
    .map(i => _.max(rows.map(row => row[i].length)))

  _.forEach(rows, row => {
    log(_.reduce(row, (out, cell, i) => out + _.padEnd(cell, maxPerCols[i]), ''))
  })
}

// Get a Gio Va with token and cache it!
// Gio Va is a pure function of sbatte we can cache it!
const gioVa = (() => {
  // Who am i?
  let __whoAmI = null

  return (fresh = false) => {
    if (!__whoAmI || fresh) {
      return api.getToken().then(token => {
        return api.me(token).then(user => {
          __whoAmI = {
            token,
            user,
          }
          return __whoAmI
        })
      })
    }
    return Promise.resolve(__whoAmI)
  }
})()

const chooseProject = () =>
  gioVa().then(({ token, user }) => {
    return api.getProjects(token).then(projects => {
        return inquirer.prompt([{
          message: 'Choose project',
          name: 'project',
          type: 'list',
          choices: projects.map(project => project.name),
        }]).then(answers => {
          return _.find(projects, { name: answers.project })
        })
    })
  })

program
  .version('0.2.0')

program
  .command('edit')
  .action(() => {
    exec(`atom ${DB_FILE}`)
  })

program
  .command('projects')
  .action(() => {
    gioVa().then(({ token }) => {
      api.getProjects(token).then(projects => {
        _.forEach(projects, project => {
          log(`${project.id} - `.green + ' ' + project.name)
          log(`${project.description}`.blue)
        })
      })
    })
  })

program
  .command('clear')
  .action(() => {
    writeSbatte({})
    log('All sbatte cleared'.green)
  })

program
  .command('start <name> [description]')
  .action((name, description) => {
    const sbatte = readSbatte()
    const sbatta = _.get(sbatte, name, {
      // Set the description only when sbatta is created
      description: _.isUndefined(description) ? '' : description,
      done: false,
      sessions: [],
    })
    const { sessions } = sbatta

    if (sessions.length > 0 && !sessions[sessions.length - 1].stop) {
      log('Sbatta alredy started, you must first close it! Sooocio'.red)
      return
    }

    writeSbatte({
      ...sbatte,
      [name]: {
        ...sbatta,
        sessions: sessions.concat({ start: moment().format(T) }),
      }
    })

    if (_.isUndefined(sbatte[name])) {
      log(
        'New sbatta '
        + `${name}`.green
        + ' created '
        + emoji.get('sparkles')
        + space()
        + emoji.get('sparkles')
        + space()
        + emoji.get('sparkles')
      )
    }

    log('Started sbatta ' + `${name}`.green)
  })

program
  .command('stop <name>')
  .action((name) => {
    const sbatte = readSbatte()
    const sbatta = _.get(sbatte, name, { sessions: [] })
    const { sessions } = sbatta

    if (sessions.length === 0 || (sessions.length > 0 && sessions[sessions.length - 1].stop)) {
      log('Before stop a sbatta you must start it! Sooocio'.red)
      return
    }

    writeSbatte({
      ...sbatte,
      [name]: {
        ...sbatta,
        sessions: updateLast(sessions, touchStop),
      }
    })

    // TODO: Log time spent on it
    log('Sbatta ' + `${name}`.green +  ' stopped')
  })

program
  .command('done <name>')
  .action((name) => {
    const sbatte = readSbatte()

    if (_.isUndefined(sbatte[name])) {
      console.log(`Sbatta ${name} does not exist`.red)
      return
    }

    const sbatta = sbatte[name]

    if (sbatta.done) {
      console.log(`Sbatta ${name} alredy done`.red)
      return
    }

    const { sessions } = sbatta

    writeSbatte({
      ...sbatte,
      [name]: {
        ...sbatta,
        done: true,
        sessions: updateLast(sbatta.sessions, touchStop),
      }
    })

    console.log(`Sbatta ${name} done!`)
  })

program
  .command('push <name>')
  .action((name) => {
    const sbatte = readSbatte()

    if (_.isUndefined(sbatte[name])) {
      console.log(`Sbatta ${name} does not exist`.red)
      return
    }

    const sbatta = sbatte[name]

    // Alredy pushed
    if (sbatta.activityId) {
      log('Sbatta alredy pushed')
      return
    }

    // Close sbatta ... and make it done!
    gioVa().then(({ user, token }) => {

      const whichProject = sbatta.project ? Promise.resolve(sbatta.project) : chooseProject()

      whichProject.then(project => {
        const questionsNotes = [{
          type: 'input',
          name: 'notes',
          message: 'Insert activity notes'
        }]

        const whatNotes = sbatta.description ? Promise.resolve(sbatta.description) : inquirer.prompt(questionsNotes)

        whatNotes.then(({ notes }) => {
          const sessions = updateLast(sbatta.sessions, touchStop)
          const date = moment(sessions[0].start, T).format(D)
          const duration = sessionsMinutesSpent(sessions)
          const activity = {
            date,
            duration,
            notes,
            agent: user.id,
            activity_type: 'development',
            tickets: [],
          }
          log(`Got the shit: \n ${JSON.stringify(activity, null, 2)}`)
          inquirer.prompt([{
            type: 'confirm',
            name: 'sure',
            message: 'Sure bro?',
          }]).then(({ sure }) => {
            if (!sure) {
              log('Go fuck yourself')
              return
            }
            api.pushActivity(token, project.id, activity).then(newActivity => {
              const updatedSbatta = {
                ...sbatta,
                project,
                sessions,
                done: true,
                description: notes,
                activityId: newActivity.id,
              }
              writeSbatte({
                ...sbatte,
                [name]: updatedSbatta,
              })
              log(`Sbatta pushed!`)
              exec(`open ${WEB_URL}/projects/${project.id}/activities/${newActivity.id}/edit`)
            })
          })
        })
      })

    })
  })

program
  .command('list')
  .action(() => {
    const sbatte = _.pickBy(readSbatte(), ({ sessions }) => sessions.length > 0)

    if (_.keys(sbatte).length === 0) {
      log('Zebra sbatte stupid monkey'.red)
      return
    }

    const sbatteByStatus = _.reduce(sbatte, (r, sbatta, name) => {
      const status = getSbattaStatus(sbatta)
      return {
        ...r,
        [status]: {
          ...r[status],
          [name]: sbatta,
        }
      }
    }, {})

    // Make sbatte rows for table
    const mapSbatte = sbatte => _.map(sbatte, (sbatta, name) => {
      const { sessions } = sbatta
      const lastSession = _.last(sessions)
      const status = getSbattaStatus(sbatta)
      const minutes = sessionsMinutesSpent(updateLast(sessions, touchStop))

      const sessionsStrs = sessions
        .map(session => {
          const start = moment(session.start, T).format(H)
          const stop = session.stop ? moment(session.stop, T).format(H) : moment().format(H)
          return `(${start} - ${stop})`
        })
        .join(' ')

      const color = STATUS_COLORS[status]
      const url = sbatta.activityId ? `${WEB_URL}/projects/${sbatta.project.id}/activities/${sbatta.activityId}` : ''

      return [
        emoji.get(STATUS_EMOJI[status]),
        space(2),
        name[color],
        space(2),
        emoji.get('hourglass_flowing_sand'),
        space(2),
        `${minutes} Min`[color],
        ' ~ '[color],
        `${sessionsStrs} ${url}`[color],
      ]
    })

    log()
    const rows = ['working', 'sleep', 'done', 'pushed'].reduce((r, status) => {
      if (!sbatteByStatus[status]) {
        return r
      }
      return r.concat(mapSbatte(sbatteByStatus[status] || []), [_.range(9).map(() => space())])
    }, [])
    logTable(rows)
  })

program.parse(process.argv)
