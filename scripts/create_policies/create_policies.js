#!/usr/bin/env node
// Copyright 2019 Tampere University
// This software was developed as a part of the CityIoT project: https://www.cityiot.fi/english
// This source code is licensed under the 3-clause BSD license. See license.txt in the repository root directory.
// Author(s): Mikko Nurminen <mikko.nurminen@tuni.fi>
// version: '3.5'
const tokens = require('./get_an_access_token/get_an_access_token.js')
const yargs = require('yargs')
const unirest = require('unirest')
const fs = require('fs')
const path = require('path')

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


const accessPolicyDirectory = 'access_policies'

fs.mkdirSync(accessPolicyDirectory)

fs.readdirSync(accessPolicyDirectory, (err, files) => {
  if (err) throw err
  for (const file of files) {
    fs.unlink(path.join(accessPolicyDirectory, file), err => {
      if (err) throw err
    })
  }
})

const gettingAccessTokens = () => {
  tokens.getTokenForAccessingApplicationsInKeyrock(argv.hostURL, argv.hostPort, argv.email, argv.password, function (appId, appName, token, keyrockAccessToken) {
    console.log(`
      Token for accessing Keyrock:  ${keyrockAccessToken}
      Application's ID:             ${appId} 
      Applications name:            ${appName} 
      Access token:                 ${token.access_token}
      Refresh token:                ${token.refresh_token}`)

    gettingRolesForAppInKeyrock(appId, appName, keyrockAccessToken)
  })
}


const gettingRolesForAppInKeyrock = (appId, appName, keyrockAccessToken) => {
  console.log('Roles for application', appName)

  unirest
    .get(argv.hostURL + '/v1/applications/' + appId + '/roles')
    .headers({
      'Content-Type': 'application/json',
      'x-auth-token': keyrockAccessToken,
    })
    .then((response) => {
      if (response.error) {
        console.log('Error in getting roles for application ', appName, '. Error: ', response.error)
      }
      console.log('Roles for application ', appName, response.body.roles)
      for (role of response.body.roles) {
        console.log(role, appName)
        createPolicyForRole(role, appId, appName)
      }
    })
}

gettingAccessTokens()

function createPolicyForRole(role, appId, appName) {
  let fiwareServiceName = role.name.substr(0, role.name.indexOf(" "));
  let readerOrWriter = role.name.split(" ").slice(-1)[0].trim();
  let permittedPath = '/v2'
  // Purchaser and Provider are internal roles connected to Keyrock app's management.
  if (role.id === "purchaser" || role.id === "provider") {
    return true
  }
  if (role.name === "Admin") {
    permittedPath = '/'
  }

  const readHttpMethods =
    `
                <ns4:AnyOf>
                  <ns4:AllOf>
                      <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                          <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">GET</ns4:AttributeValue>
                          <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                      </ns4:Match>
                  </ns4:AllOf>
                  <ns4:AllOf>
                      <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                          <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">HEAD</ns4:AttributeValue>
                          <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                      </ns4:Match>
                  </ns4:AllOf>
                </ns4:AnyOf>
`;

  const writeHttpMethods =
    ` 
                <ns4:AnyOf>
                  <ns4:AllOf>
                      <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                          <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">POST</ns4:AttributeValue>
                          <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                      </ns4:Match>
                  </ns4:AllOf>
                  <ns4:AllOf>
                      <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                          <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">DELETE</ns4:AttributeValue>
                          <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                      </ns4:Match>
                  </ns4:AllOf>
                  <ns4:AllOf>
                  <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                      <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">PATCH</ns4:AttributeValue>
                      <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                  </ns4:Match>
                </ns4:AllOf>
                <ns4:AllOf>
                <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                    <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">PUT</ns4:AttributeValue>
                    <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                </ns4:Match>
              </ns4:AllOf>
            </ns4:AnyOf>
`;

  const readAndWriteHttpMethods =
    ` 
            <ns4:AnyOf>
              <ns4:AllOf>
                <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                    <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">GET</ns4:AttributeValue>
                    <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                </ns4:Match>
              </ns4:AllOf>
              <ns4:AllOf>
                  <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                      <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">HEAD</ns4:AttributeValue>
                      <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                  </ns4:Match>
              </ns4:AllOf>
              <ns4:AllOf>
                  <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                      <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">POST</ns4:AttributeValue>
                      <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                  </ns4:Match>
              </ns4:AllOf>
              <ns4:AllOf>
                  <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                      <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">DELETE</ns4:AttributeValue>
                      <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                  </ns4:Match>
              </ns4:AllOf>
              <ns4:AllOf>
                <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                    <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">PATCH</ns4:AttributeValue>
                    <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                </ns4:Match>
            </ns4:AllOf>
            <ns4:AllOf>
              <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                  <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">PUT</ns4:AttributeValue>
                  <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
              </ns4:Match>
          </ns4:AllOf>
        </ns4:AnyOf>
`;

  const policyTargetRule = `
<!-- Begin access rule policy for role ${role.name} (${role.id}) in application ${appName} (${appId}) -->
    <ns4:Policy PolicyId="${role.id}" Version="1.0" RuleCombiningAlgId="urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-unless-permit">
        <ns4:Description>Role  ${role.name} (id: ${role.id}) from application ${appName} (id: ${appId})</ns4:Description>
        <ns4:Target>
            <ns4:AnyOf>
                <ns4:AllOf>
                    <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                        <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">${appId}</ns4:AttributeValue>
                        <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" AttributeId="urn:oasis:names:tc:xacml:1.0:resource:resource-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                    </ns4:Match>
                </ns4:AllOf>
            </ns4:AnyOf>
        </ns4:Target>
        <ns4:Rule RuleId="ef0c6ce7-5b9e-48cc-8db5-38f9dc124fe1" Effect="Permit">
            <ns4:Description>Access rule for role ${role.id}</ns4:Description>
            <ns4:Target>
                <ns4:AnyOf>
                    <ns4:AllOf>
                        <ns4:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-starts-with">
                            <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">${permittedPath}</ns4:AttributeValue>
                            <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" AttributeId="urn:thales:xacml:2.0:resource:sub-resource-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                        </ns4:Match>
                    </ns4:AllOf>
                </ns4:AnyOf>`;

  const fiwareServiceRoleCondition =
    `
                <ns4:AnyOf>
                  <ns4:AllOf>
                    <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                      <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">${fiwareServiceName}</ns4:AttributeValue>
                      <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" AttributeId="fiware-service" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true" />
                    </ns4:Match>
                  </ns4:AllOf>
                </ns4:AnyOf>
                <!-- FIWARE servicepath commented out... for now. :-)
                <ns4:AnyOf>
                  <ns4:AllOf>
                    <ns4:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                      <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">/#</ns4:AttributeValue>
                      <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" AttributeId="fiware-servicepath" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                    </ns4:Match>
                  </ns4:AllOf>
                </ns4:AnyOf>
                -->
                    </ns4:Target>
                    <ns4:Condition>
                        <ns4:Apply FunctionId="urn:oasis:names:tc:xacml:3.0:function:any-of">
                            <Function FunctionId="urn:oasis:names:tc:xacml:1.0:function:string-equal"/>
                            <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">${role.id}</ns4:AttributeValue>
                            <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" AttributeId="urn:oasis:names:tc:xacml:2.0:subject:role" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
                        </ns4:Apply>
                    </ns4:Condition>
                </ns4:Rule>
            </ns4:Policy>
<!-- End access rules for role ${role.name} (${role.id}) -->
`;

  // We don't limit the Admin role access to any specific FIWARE 
  const noFiwareServiceLimitRoleCondition =
    `        </ns4:Target>
        <ns4:Condition>
            <ns4:Apply FunctionId="urn:oasis:names:tc:xacml:3.0:function:any-of">
                <ns4:Function FunctionId="urn:oasis:names:tc:xacml:1.0:function:string-equal"/>
                <ns4:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">${role.id}</ns4:AttributeValue>
                <ns4:AttributeDesignator Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" AttributeId="urn:oasis:names:tc:xacml:2.0:subject:role" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
            </ns4:Apply>
        </ns4:Condition>
    </ns4:Rule>
</ns4:Policy>
<!-- End of access rule policy for role ${role.name} (${role.id}) in application ${appName} (${appId}) -->
`;

  if (readerOrWriter === 'reader') {
    fs.appendFile(accessPolicyDirectory + '/' + appName + '-' + role.name + '_policies.xml', policyTargetRule + readHttpMethods + fiwareServiceRoleCondition, (err) => {
      if (err) throw err;
      console.log('The data was written to file!')
    })
  }
  else if (readerOrWriter === 'writer') {
    fs.appendFile(accessPolicyDirectory + '/' + appName + '-' + role.name + '_policies.xml', policyTargetRule + writeHttpMethods + fiwareServiceRoleCondition, (err) => {
      if (err) throw err;
      console.log('The data was written to file!')
    })

  }
  else if (role.name === 'Read all services') {
    fs.appendFile(accessPolicyDirectory + '/' + appName + '-' + role.name + '_policies.xml', policyTargetRule + readHttpMethods + noFiwareServiceLimitRoleCondition, (err) => {
      if (err) throw err;
      console.log('The data was written to file!')
    })
  }
  else if (role.name === 'Admin') {
    fs.appendFile(accessPolicyDirectory + '/' + appName + '-' + role.name + '_policies.xml', policyTargetRule + readAndWriteHttpMethods + noFiwareServiceLimitRoleCondition, (err) => {
      if (err) throw err;
      console.log('The data was written to file!')
    });
  }

}
