# FIWARE access controls

This document gives an example implementing basic level 2 access control, and using Wilma proxy to secure access to Orion.

## Implementing level 2  access control
In the following sections level 2 access control is implemented, and Wilma is used to protect Orion. In CityIoT documents there levels are called _basic level_ for level 2 with Keyrock and Wilma, and _advanced level_ which also includes AuthZForce.

### Docker Compose and setting files
User has to have both Docker and Docker Compose installed.

Docker Compose files used for basic and advanced levels can be found in this repo:

- Basic: /platform/experiments/fiware_access_control/basic_access_control/docker-compose-basic-level.yml  

Settings files for basic security level for Keyrock and Wilma are in this repo,too:

- Keyrock IDM configuration: /platform/experiments/fiware_access_control/basic_access_control/config/keyrock7.7_config.js
- Wilma PEP configuration: /platform/experiments/fiware_access_control/basic_access_control/config/wilma7.7_config.js

You should read though those three files. You must make the required changes in the _docker-compose-basic-level.yml_. The file is commented to help in making the required changes.

### Basic level access control
Basic level access control system can be started by running following command:   
_$ docker-compose -f docker-compose-basic-level.yml up --build_   
This starts containers for Keyrock, Wilma, Orion and the needed databases MongoDB and MySQL. On the first run Wilma PEP Proxy's container will stop as it cannot connect to Keyrock with the values set for it in the Docker Compose file. The correct values for PEP_PROXY_APP_ID, PEP_PROXY_USERNAME, and PEP_PASSWORD can only be known from Keyrock after the application settings for Orion have been entered there. These correct values are fetched in later sections, namely "Creating a new application" will yield application ID we will use as PEP_PROXY_APP_ID, and from "Creating a Wilma PEP proxy for an application" we get the PEP_PROXY_USERNAME, and PEP_PASSWORD.

**NOTE: Keyrock administration Web page.** Keyrock resources can be managed through its administration Web page, which can be accessed in _[http://localhost:3005](http://localhost:3005)_ in the running Docker Compose system that is setup in this document. But in the following examples resources are manipulated through Keyrock's API, as this way the reader can get a view of how the process could be automated and scaled up to larger installations.

### Setting up Keyrock database
After containers are up, additional steps are required inside Keyrock container. To open a terminal running in Keyrock container:  
_$ docker exec -it basic_access_control_keyrock-idm_1 bash_  
Your container name might be different from _basic_access_control_keyrock-idm_1_. You can use _docker ps_ command to see all running containers.  

When you are in the terminal inside Keyrock-container, run the following commands:

- first read the README.md inside the container: _$ cat README.md_
- create the default database structure (if the database exists,  script exits): _$ npm run-script create_db_
- creates the database structure: _$ npm run-script migrate_db_
- seed tables with the admin user, etc.: _$ npm run-script seed_db_

As the admin user was created when _npm_-commands were run inside Keyrock, it is static, and can be used as-is. The settings for the admin user are set in the Docker Compose's Keyrock container's variables IDM_ADMIN_USER, IDM_ADMIN_EMAIL, and IDM_ADMIN_PASS.

### Keyrock assets and RESTful API
After the containers are running, it is time to look at how we can manage Keyrock's resources through its API. This API is described in [https://keyrock.docs.apiary.io/#reference/keyrock-api](https://keyrock.docs.apiary.io/#reference/keyrock-api), including explanation of the resources, and interactive examples for requests and responses.

**NOTE: some assembly needed.** Examples in this document can be used with the running Docker system with small modifications, like filling in the correct variable values for access tokens, app IDs, etc. In the requests and responses in this documents the values are just placeholders, for example _$ACCESSOKEN_.

#### Retrieving an access token to Keyrock
The user must get an access key to access Keyrock resources through its API. The user can use the either the API's password method, or the token method to fetch an access key. In password method the requests body must include a JSON with an existing Keyrock user's email (not username!) and password.

In the response for each request a new _X-Subject-Token_ will be created. _X-Subject-Token_ header value in response can be used as the _X-Auth-token_ header in following requests to Keyrock.

**NOTE:** The access token needed to manipulate _Keyrock and its resources_ is different from the token that is needed to access the resources of _an application defined in Keyrock_, the application access token creation process is described later in this document.

##### Request
      $ curl --include --request POST \
      --header "Content-Type: application/json" \
      --data-binary "{
        \"name\": \"tester-admin@tester.com\",
        \"password\": \"tester-2020\"
      }" \
      'http://localhost:3005/v1/auth/tokens'

##### Response
    HTTP/1.1 201 Created
    X-Subject-Token: $ACCESSTOKEN
    {
        "idm_authorization_config": {
            "authzforce": false,
            "level": "basic"
        },
        "token": {
            "expires_at": "2019-01-10T20:18:39.437Z",
            "methods": [
                "password"
            ]
        }
    }


#### Create a user
With this request we can create a new user to Keyrock. We use the X-Subject-Token header value from the response above in the X-Auth-token header here. Example request and response:

##### Request
    $ curl --request POST \
         --header "Content-Type: application/json" \
         --header "X-Auth-token: $ACCESSTOKEN" \
         --data-binary "{
        \"user\": {
            \"username\": \"kaisa\",
            \"email\": \"kaisa@organization.com\",
            \"password\": \"kaisansala\"
        } }" 'http://localhost:3005/v1/users'

##### Response
    HTTP/1.1 201 Created
    {
        "user": {
            "admin": false,
            "date_password": "2019-04-09T11:41:24.411Z",
            "eidas_id": null,
            "email": "kaisa@organization.com",
            "enabled": true,
            "gravatar": false,
            "id": "$USERID",
            "image": "default",
            "salt": "1595cdd806c69034",
            "starters_tour_ended": false,
            "username": "kaisa"
    }


#### Creating a new application
A new application can be created with a request like the following:

##### Request
    $ curl --include \
         --request POST \
         --header "Content-Type: application/json" \
         --header "X-Auth-token: $ACCESSTOKEN" \
         --data-binary "{
      \"application\": {
        \"name\": \"Securing access to Orion\",
        \"description\": \"Providing a Wilma PEP Proxy to secure Orion.\",
        \"redirect_uri\": \"http://localhost/login\",
        \"url\": \"http://localhost:1026\",
        \"grant_type\": [
          \"authorization_code\",
          \"password\"
        ],
        \"token_types\": [
            \"jwt\",
            \"permanent\"
        ]
      }
    }" \
    'http://localhost:3005/v1/applications'

##### Response
    HTTP/1.1 201 Created
    {
      "application": {
          "description": "Providing a Wilma PEP Proxy to secure Orion.",
          "grant_type": "password,authorization_code",
          "id": "$APPLICATIONID",
          "image": "default",
          "jwt_secret": "7faf1226b403839c",
          "name": "Securing access to Orion",
          "redirect_uri": "http://localhost/login",
          "response_type": "code",
          "secret": "$APPLICATIONSECRET",
          "token_types": "jwt,permanent,bearer",
          "url": "http://localhost:1026"
      }
    }

#### Retrieving available applications
A user can use a request to get the applications for which the user has been authorized, and in which they or the organizations they belong to have been assigned at least one role. Noticeable are the OAuth2 grant types used with each application.

##### Request
    $ curl --include  \
    --header "X-Auth-token: $ACCESSTOKEN" \
    'http://localhost:3005/v1/applications'

##### Response
    {
      "applications": [
          {
              "client_type": null,
              "description": "Providing a Wilma PEP Proxy to secure Orion.",
              "grant_type": "password,authorization_code",
              "id": "$APPLICATIONID",
              "image": "default",
              "jwt_secret": "7faf1226b403839c",
              "name": "Securing access to Orion",
              "redirect_uri": "http://localhost/login",
              "response_type": "code",
              "token_types": "jwt,permanent,bearer",
              "url": "http://localhost:1026",
              "urls": {
                  "iot_agents_url": "/v1/applications/$APPLICATIONID/iot_agents",
                  "pep_proxies_url": "/v1/applications/$APPLICATIONID/pep_proxies",
                  "permissions_url": "/v1/applications/$APPLICATIONID/permissions",
                  "roles_url": "/v1/applications/$APPLICATIONID/roles",
                  "trusted_applications_url": "/v1/applications/$APPLICATIONID/trusted_applications",
                  "users_url": "/v1/applications/$APPLICATIONID/users"
              }
          }
      ]
  }

#### Creating a Wilma PEP proxy for an application
A Wilma proxy can be attached to the application created in the previous example, so that the traffic goes to Orion goes through the proxy. Notice that the the format for the URL and the path is http://localhost:3005/v1/applications/_$APPLICATION_ID_/pep_proxies, so the application's ID must be known when making the request. In the above example the application ID is _$APPLICATIONID_.

##### Request
    $ curl --include --request POST \
         --header "Content-Type: application/json" \
         --header "X-Auth-token: $ACCESSTOKEN" \
      'http://localhost:3005/v1/applications/$APPLICATIONID/pep_proxies'

##### Response
    HTTP/1.1 201 Created
    {
        "pep_proxy": {
            "id": "pep_proxy_49a94f3b-0c59-43f3-a346-6399a633adae",
            "password": "pep_proxy_b495ccce-3f57-4d67-babd-8b02a77e897b"
        }
    }

These "id" and "password" values are needed for connecting the application that is to be secured to a Wilma instance protecting it. The "id" corresponds with "Pep Proxy Username" field in in application's PEP Proxy-settings in Keyrock's administration Web pages, while "password" correspond with "Pep Proxy Password" field.

**User needs to modify Wilma's configuration in Docker Compose and then restart its container.**  In _./docker-compose-basic-level.yml_ edit the following:
      - PEP_PROXY_APP_ID=ENTER_ORION_APP_ID_FROM_KEYROCK
      - PEP_PROXY_USERNAME=ENTER_PEP_PROXY_USERNAME_FROM_KEYROCK
      - PEP_PASSWORD=ENTER_PEP_PROXY_PASSWORD_FROM_KEYROCK

so that it reflect an app and its associated Wilma proxy.

After this, Wilma's container needs to be killed and rebuilt. This can be done using the following two commands:

- _$ docker-compose -f docker-compose-basic-level.yml kill wilma-proxy_
- _$ docker-compose -f docker-compose-basic-level.yml up --no-deps --build wilma-proxy_

#### Creating a role in an application
To give users permissions to resources within an application, first roles have to be created, then permissions added to these roles, and finally roles are assigned to the users.

Here we start by creating a role.

##### Request
    $ curl --include \
         --request POST \
         --header "Content-Type: application/json" \
         --header "X-Auth-token: $ACCESSTOKEN" \
         --data-binary "{
      \"role\": {
        \"name\": \"Web_user\"
      }}"\
    "http://localhost:3005/v1/applications/$APPLICATIONID/roles"

##### Response
    {
      "role": {
          "id": "$ROLEID",
          "is_internal": false,
          "name": "Web user",
          "oauth_client_id": "$APPLICATIONID"
      }
  }

#### Creating a permission based on HTTP Method and path
Permissions have to be created, so that they can given to roles and organizations to authorize different levels of access to an application. Application ID in the request path defines the application to which the permission is linked to. An example permission is created below, where the HTTP method _GET_ and path _/v2/entities_ are defined.

##### Request
    $ curl --include \
         --request POST \
         --header "Content-Type: application/json" \
         --header "X-Auth-token: $ACCESSTOKEN" \
         --data-binary "{
      \"permission\": {
        \"name\": \"GET Orion entities\",
        \"action\": \"GET\",
        \"resource\": \"/v2/entities\"
      }
    }" \
    "http://localhost:3005/v1/applications/$APPLICATIONID/permissions"

##### Response
    {
      "permission": {
          "action": "GET",
          "id": "$PERMISSIONID",
          "is_internal": false,
          "name": "GET Orion entities",
          "oauth_client_id": "$APPLICATIONID",
          "resource": "/v2/entities"
      }
  }

#### Assigning a permission to a role
Now a permission is added to a role. In the example the application, role, and permission created in the previous steps are used.

##### Request
    $ curl --include \
       --request POST \
       --header "Content-Type: application/json" \
       --header "X-Auth-token: $ACCESSTOKEN" \
    "http://localhost:3005/v1/applications/$APPLICATIONID/roles/$ROLEID/permissions/$PERMISSIONID"

##### Response
    {
      "role_permission_assignments": {
          "permission_id": "$PERMISSIONID",
          "role_id": "$ROLEID"
      }
    }

#### Adding a role to a user
Now a role is given to a user, after which all the permissions given to a role apply to this user, too. After this stage the user we created should be able to make queries to Orion through Wilma proxy server, with permissions checks.

##### Request
    $ curl --include \
       --request POST \
       --header "Content-Type: application/json" \
       --header "X-Auth-token: $ACCESSTOKEN" \
    "http://localhost:3005/v1/applications/$APPLICATIONID/users/$USERID/roles/$ROLEID"

##### Response
    {
      "role_user_assignments": {
          "oauth_client_id": "$APPLICATIONID",
          "role_id": "$ROLEID",
          "user_id": "$USERID"
      }
    }

### Making queries to Orion behind a Wilma proxy
After the Keyrock, Wilma, and Orion have been set up correctly, requests can made to Wilma which will direct them to Orion.  

OAuth2-based access control in available for registered application users. When making requests the Authorization header is built by combining the application Client ID and Client Secret credentials from Keyrock must be attained. Application information can be with a requested with:

#### Request
    $ curl --include      --header "X-Auth-token: $ACCESSTOKEN"   'http://localhost:3005/v1/applications/$APPLICATIONID'

#### Response
From the response the "id" and "secret" properties and their values are needed in the following steps.    

    {
      "application": {
          "client_type": null,
          "description": "Providing a Wilma PEP Proxy to secure Orion.",
          "extra": null,
          "grant_type": "password,authorization_code",
          "id": "$APPLICATIONID",
          "image": "default",
          "jwt_secret": "7faf1226b403839c",
          "name": "Securing access to Orion",
          "redirect_uri": "http://localhost/login",
          "response_type": "code",
          "scope": null,
          "secret": "$APPLICATIONSECRET",
          "token_types": "jwt,permanent,bearer",
          "url": "http://localhost:1026",
          "urls": {
              "iot_agents_url": "/v1/applications/$APPLICATIONID/iot_agents",
              "pep_proxies_url": "/v1/applications/$APPLICATIONID/pep_proxies",
              "permissions_url": "/v1/applications/$APPLICATIONID/permissions",
              "roles_url": "/v1/applications/$APPLICATIONID/roles",
              "trusted_applications_url": "/v1/applications/$APPLICATIONID/trusted_applications",
              "users_url": "/v1/applications/$APPLICATIONID/users"
          }
       }
     }

Based on the response's _"id"_ and _"secret"_ fields' values, a base64 hash has to be created, as it is used when user is authenticated. Values have to separated by a _:_ and be base64 encoded, so the format is _"id"_:_"secret"_. For the example application the base64 encoded string would be generated as shown here:  
_$ echo -n  "$APPLICATIONID:$APPLICATIONSECRET" | base64 -w 255_

Running this command produces the string:  
_ZmM3M2UzNzktMWQzYS00YTBlLWJkOWMtY2NhNmUyMWIyYWI1OjQ3YjJmNjI2LWNkNjMtNDY2Ny05MWY4LWNiY2I4MDgwNTk1Nw==_

(NOTICE: here [base64 problem with endlines](https://stackoverflow.com/questions/36432860/bash-base64-producing-inconsistent-output) is circumvented by adding the _-n_ parameter to echo)

This base64 string has to entered as value in requests' _Authorization_ header as part of _Basic HTTP authentication_, which should not be confused with _basic/level 2 access control_. An example:    
_Authorization: Basic ZmM3M2UzNzktMWQzYS00YTBlLWJkOWMtY2NhNmUyMWIyYWI1OjQ3YjJmNjI2LWNkNjMtNDY2Ny05MWY4LWNiY2I4MDgwNTk1Nw==_.

#### Request with a user who **IS NOT** authorized to access the application resources
First we fetch an access token from Keyrock with a user that exist in Keyrock, but has no access rights to the application.   

    $ curl -iX POST \
      'http://localhost:3005/oauth2/token' \
      -H 'Accept: application/json' \
      -H 'Authorization: Basic MjZiMWQxZmItZGYzYy00YWU3LTk2YzItODJkZTZlNWMwMjQ5OmIwMTg2MjRjLTk3YWUtNDA1MC04ZTUyLTFmODRhOWY3OTA5MA==' \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data  "grant_type=password&username=patrik@mail.com&password=patensala"

#### Response to access key request
    {
      "access_token":"$ACCESSTOKEN",
      "token_type":"Bearer",
      "expires_in":3599,
      "refresh_token":"a1d8dad7c4645bda437dc5c8c25fb998c1e1982c",
      "scope":["bearer"]
    }

#### Request going through Wilma PEP Proxy
    $ curl localhost:1027/v2/entities --header "X-Auth-token: $ACCESSTOKEN"

#### Response
_"User access-token not authorized"_

#### Request with a user who **IS** authorized to access the application resources
First we fetch an access token from Keyrock for a user we assigned permissions to in Keyrock.   

    $ curl -iX POST \
      'http://localhost:3005/oauth2/token' \
      -H 'Accept: application/json' \
      -H 'Authorization: Basic MjZiMWQxZmItZGYzYy00YWU3LTk2YzItODJkZTZlNWMwMjQ5OmIwMTg2MjRjLTk3YWUtNDA1MC04ZTUyLTFmODRhOWY3OTA5MA==' \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data  "grant_type=password&username=kaisa@organization.com&password=kaisansala"

#### Response to access key request
    {
      "access_token":"$ACCESSTOKEN",
      "token_type":"Bearer",
      "expires_in":3599,
      "refresh_token":"86d8e611270ad1476155260318785930e28a79e3",
      "scope":["bearer"]
    }

#### Request going through Wilma PEP Proxy
    $ curl localhost:1027/v2/entities --header "X-Auth-token: $ACCESSTOKEN"

#### Response
The entities in the Orion's default FIWARE service, and FIWARE servicepath. If no entities have been added, then an empty array, _[]_.

## Final notes
After doing the steps above, a working FIWARE system with _basic_ or _level 2_ access control is set up. However, the access permissions are limited to HTTP method + path-combinations. For more fine-grained access control options, the _advanced_ or _level 3_ security with AuthZForce is needed. You can find tutorial for it from /platform/experiments/fiware_access_control/advanced_access_control.
