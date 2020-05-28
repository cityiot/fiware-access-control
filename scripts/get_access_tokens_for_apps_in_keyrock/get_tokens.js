const tokens = require('./get_an_access_token/get_an_access_token.js')
const yargs = require('yargs')

// if ran from the command line
const argv = yargs
  .option('hostURL', {
    alias: 'url',
    description: 'Keyrock server URL',
    type: 'text'
  })
  .option('hostPort', {
    alias: 'port',
    description: 'Keyrock server port',
    type: 'text'
  })
  .option('email', {
    alias: 'e',
    description: 'Keyrock user\'s email',
    type: 'text'
  })
  .option('password', {
    alias: 'p',
    description: 'Keyrock user\'s password',
    type: 'text'
  })
  .option('getKeyrockToken', {
    alias: 'g',
    description: 'Get token to access Keyrock\'s own resources',
    type: 'boolean'
  })
  .help()
  .alias('help', 'h')
  .demandOption(['hostURL', 'email', 'password'])
  .argv

var gettinTheKeys = () => {
  tokens.getTokenForAccessingApplicationsInKeyrock(argv.hostURL, argv.hostPort, argv.email, argv.password, function (appId, appName, appAccessToken, keyrockAccessToken) {
    console.log(`
      Token for accessing Keyrock:  ${keyrockAccessToken}
      Application's ID:             ${appId} 
      Applications name:            ${appName} 
      Access token:                 ${appAccessToken.access_token}
      Refresh token:                ${appAccessToken.refresh_token}`)
  })
}

gettinTheKeys('')
