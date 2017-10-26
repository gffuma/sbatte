const moment = require('moment')
const { last } = require('lodash')

module.exports.updateLast = (list, updater) => {
  if (list.length === 0) {
    return []
  }

  return list.slice(list, list.length - 1)
    .concat(updater(list[list.length - 1]))
}

// Eaaaazy Format shortcut

// TIME
const T = 'YYYY-MM-DD HH:mm'
module.exports.T = T

// DATE
const D = 'YYYY-MM-DD'
module.exports.D = D

// HOUR
const H = 'HH:mm'
module.exports.H = H

module.exports.sessionsMinutesSpent = sessions => sessions.reduce((minutes, s) => {
  const start = moment(s.start, T)
  const stop = moment(s.stop, T)
  return minutes + stop.diff(start, 'minutes')
}, 0)

module.exports.touchStop = s => ({
  ...s,
  stop: s.stop ? s.stop : moment().format(T),
})

module.exports.getSbattaStatus = sbatta => {
  if (sbatta.activityId) {
    return 'pushed'
  } else if (sbatta.done) {
    return 'done'
  } else {
    const lastSession = last(sbatta.sessions)
    if (lastSession.stop) {
      return 'sleep'
    } else {
      return 'working'
    }
  }
}
