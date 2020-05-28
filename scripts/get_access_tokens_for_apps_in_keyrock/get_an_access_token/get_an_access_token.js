// Copyright 2019 Tampere University
// This software was developed as a part of the CityIoT project: https://www.cityiot.fi/english
// This source code is licensed under the 3-clause BSD license. See license.txt in the repository root directory.
// Author(s): Mikko Nurminen <mikko.nurminen@tuni.fi>
const unirest = require('unirest')

module.exports.getTokenForAccessingApplicationsInKeyrock = function (hostUrl, hostPort, userEmail, userPassword, callback) {
  const IDM_HOST = hostUrl
  const IDM_PORT = hostPort

  const CredentialsJSON = { name: userEmail, password: userPassword }

  let requestHostPort = IDM_HOST
  if (IDM_PORT) {
    requestHostPort = IDM_HOST + ':' + IDM_PORT
  }

  unirest
    .post(requestHostPort + '/v1/auth/tokens')
    .headers({
      'Content-Type': 'application/json'
    })
    .send(JSON.stringify(CredentialsJSON))
    .then((response) => {
      if (response.error) {
        console.log('Error in requesting applications from Keyrock: ', response.raw_body)
      }
      const accessToken = response.headers['x-subject-token']
      unirest.get(requestHostPort + '/v1/applications')
        .headers({ 'X-Auth-token': accessToken })
        .then((response) => {
          const apps = response.body.applications
          for (const app in apps) {
            unirest.get(requestHostPort + '/v1/applications/' + apps[app].id)
              .headers({
                'X-Auth-token': accessToken
              })
              .then(response => {
                const appInfo = response.body
                const base64clientsecret = Buffer.from(appInfo.application.id + ':' + appInfo.application.secret).toString('base64')
                unirest.post(requestHostPort + '/oauth2/token')
                  .headers(
                    {
                      Accept: 'application/json',
                      'Content-Type': 'application/x-www-form-urlencoded',
                      Authorization: 'Basic ' + base64clientsecret
                    }
                  )
                  .send('grant_type=password')
                  .send(`username=${userEmail}`)
                  .send(`password=${userPassword}`)
                  .then((response) => {
                    const token = response
                    token.application = {}
                    token.application.id = appInfo.application.id
                    token.application.name = appInfo.application.name
                    callback(appInfo.application.id, appInfo.application.name, JSON.parse(response.raw_body), accessToken)
                  })
                  .catch((error) => {
                    // Here the error is that the user does not have
                    // access rights to the application in Keyrock. Oh well, just ignore for now.
                    console.log('1', error)
                    return true
                  })
              })
              .catch((error) => {
                // Here the error is that the user does not have
                // access rights to the application in Keyrock. Oh well, just ignore for now.
                // console.log('2', error)
                return true
              })
          }
        })
    })
    .catch((error) => {
      console.error('error when requestin applications from Keyrock.', error)
    })
}
