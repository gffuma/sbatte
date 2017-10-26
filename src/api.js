const request = require('superagent')
const API_URL = process.env.ROOT_URL

module.exports.getToken = () =>
  request.post(`${API_URL}/api/token-auth/`).send({
    email: process.env.EMAIL,
    password: process.env.PASSWORD,
  })
  .then(({ body }) => body.token)

module.exports.me = (token) =>
  request
    .get(`${API_URL}/api/me/`)
    .set('Authorization', `JWT ${token}`)
    .then(({ body }) => body)

module.exports.getProjects = (token) =>
  request
    .get(`${API_URL}/api/projects/`)
    .set('Authorization', `JWT ${token}`)
    .then(({ body }) => body.results)

module.exports.pushActivity = (token, projectId, activity) =>
  request
    .post(`${API_URL}/api/projects/${projectId}/activities/`)
    .send(activity)
    .set('Authorization', `JWT ${token}`)
    .then(({ body }) => body)
