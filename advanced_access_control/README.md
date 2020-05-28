# FIWARE advanced access controls 

This document gives an example of implementing advanced level 3 access control using AuthZForce as PAP (Policy Administration Point) to store and manage access rules written in XACML, as well as a PDP (Policy Decicion Point) to make access decisions based on those rules.

It is expected that the user has read through the basic level 2 access control implementation before moving on to this advanced implementation. The basic level implementation can be found in /platform/experiments/fiware_access_control/basic_access_control.

## Implementing level 3  access control

### Docker Compose stack and its setting files
User has to have both Docker and Docker Compose installed.

This advanced access control setup uses Docker stacks to create stack for 
- access control components
- MongoDB
- Orion Context Broker
- Quantum Leap
The files where they are configured are:
- access control components (advanced_access_control/docker-compose-accesscontrol.yml)
- MongoDB (advanced_access_control/docker-compose-mongo.yml)
- Orion Context Broker (advanced_access_control/docker-compose-orion.yml)
- Quantum Leap (advanced_access_control/docker-compose-quantumleap.yml)

Settings files for Keyrock and Wilma are in this repo,too:
- Keyrock IDM configuration: /platform/experiments/fiware_access_control/advanced_access_control/config/keyrock7.7_config.js
- Wilma PEP configuration: /platform/experiments/fiware_access_control/advanced_access_control/config/wilma7.7_config.js

### Advanced level access control
Docker stacks used in advanced level access control system can be started by running following script:  
_$ advanced_access_control/start_stacks.sh_  

This starts the needed stacks, and creates a named network that is used.

#### Changes in the Docker Compose file from basic level access control
Several changes were are in the Docker Compose file's services for enabling AuthzForce, and enabling other Docker services communicating with it.

##### Added to the Keyrock service
For the service's _depends_on_:

    - authzforce				     

For the service's _environment_:   

    - IDM_PDP_LEVEL=advanced				      
    - IDM_AUTHZFORCE_ENABLED=true			      
    - IDM_AUTHZFORCE_HOST=authzforce			      
    - IDM_AUTHZFORCE_PORT=8080

##### Added to the Wilma PEP Proxy service
For the service's _depends_on_:

    - authzforce

For the service's _environment_:   

    - PEP_PROXY_PDP=authzforce			     
    - PEP_PROXY_AZF_PROTOCOL=http			     
    - PEP_PROXY_AZF_HOST=authzforce			 
    - PEP_PROXY_AZF_PORT=8080				      
    - PEP_PROXY_AUTH_ENABLED=true

##### AuthZForce service
    authzforce:
      image: fiware/authzforce-ce-server:release-8.1.0
      ports:
        - "8080:8080"
      volumes:
        - ./authzforce/domains:/opt/authzforce-ce-server/data/domains
      healthcheck:
        test: curl --fail -s http://localhost:8080/authzforce-ce/version || exit 1

## Extending Wilma to send Fiware service and Fiware servicepath
For information on how to include Fiware service and Fiware servicepath headers in the access decision request, information is available in the file advanced_access_control/documents/build_wilma_with_fiware_header_support.txt.

For discussion about this matter, see
[How can Fiware services and service paths be used in XACML rules?](https://stackoverflow.com/questions/54672389/how-can-fiware-services-and-service-paths-be-used-in-xacml-rules).


1. How to add new XACML rules to AuthZForce domain connected with an app Wilma-protected in Keyrock
----------------------------------------------------------------------------------------------------

The components involved, and the communication between them

[ Client application ]
  |
1. request with user's OAuth2 token to Orion Context Broker
  |
  |
  |     |--- 5a. DENY ------> "User token not authorized" response to the [ Client Application ]
  |     |
  |   5 <> - 5b. PERMIT -----> forward client request to [ Orion ]
  V     |
[ Wilma PEP ] <----------------------------
  |      |                                |
  |      2. check the roles connected     |
  |      with the OAuth2 token            |
  |      |                                |
  |    [ Keyrock ]                     4. access decision (PERMIT or DENY)
  |                                       |
  |                                       |
3. access decision request                |
  |                                       |
  V                                       |
[AuthZForce PAP] --------------------------


Prepare the applications in Keyrock
-----------------------------------------------------
- you can use the Keyrock Web page, or Keyrock's API
- Keyrock admin credentials from advanced_access_control/docker-compose-accesscontrol.yml:
      - IDM_ADMIN_EMAIL=tester-admin@tester.com
      - IDM_ADMIN_PASS=tester-2020

If you need to create the needed applications in Keyrock for the apps, see instruction in basic_access_control/README.md.
If you use previously created applications in Keyrock, you can remove all unneeded custom user-created roles and permissions.

In Keyrock you need to create at least one role and add a permission for it your applications, then Keyrock will automatically create a domain for the application in AuthZForce. This domain will be modified in the following steps. 

Get AuthZForce domain for the application from the MySQL Docker container
-----------------------------------------------------
First we check what applications have a domain set for them in Keyrock's MySQL database. You need to run the following commands:

- 'docker exec -it $YOUR_CONTAINER bash' into the MySQL container
- 'mysql -p', password is idm_root_password (set in access control Docker Compose file)
- use idm_db; -- Use the database created with Docker
- select * from authzforce;

Example output is:
+------------------------+--------------------------------------+---------+--------------------------------------+
| az_domain              | policy                               | version | oauth_client_id                      |
+------------------------+--------------------------------------+---------+--------------------------------------+
| aTTKZZdhEemoDQJCwKggDg | 914e8f3b-fde1-49df-82cd-617450e0e2ec |       2 | APPLICATION_ID |
+------------------------+--------------------------------------+---------+--------------------------------------+

From the output we can gather following information:
- oauth_client_id matches the "Securing Orion" application ID
- AuthZForce domain that is specific to this application, is in the az_domain-column: aTTKZZdhEemoDQJCwKggDg
- The root policy set for the "Securing Orion" app is in the policy-column: 914e8f3b-fde1-49df-82cd-617450e0e2ec
  The root policy is where AuthZForce starts its decision process (permit||deny), when it receives a request for permission decision.

Getting the XACML for the access rules from application's domain in AuthZForce 
- wel will be using the Keyrock generated XACML access rules as basis for modifications, so we need to fetch one to work off
- list domains:
    curl YOUR_AUTHZFORCE_HOST/authzforce-ce/domains/
- contents of the root policy can be accessed with 
(in the URL path: 
"../pap/.." = Policy Administration Point
 "../VERSION_NUMBER_OF_THE_POLICY/" = the latest version of the policy):
  curl YOUR_AUTHZFORCE_HOST/authzforce-ce/domains/APPLICATIONS_AUTHZFORCE_DOMAIN_ID/pap/policies/APPLICATIONS_POLICY_SET/VERSION_NUMBER_OF_THE_POLICY > domains.xml && xmllint --format domains.xml


Get the needed Keyrock token and OAuth2 user token
-----------------------------------------------------
You can use the Node.js app from the directory _scripts/get_access_tokens_for_apps_in_keyrock_ your console to get the admin access key for Keyrock. Go to the directory and run _$ npm start -- --help_ to get started. You shouls see:
Options:
  --version              Show version number                           [boolean]
  --hostURL, --url       Keyrock server URL                           [required]
  --hostPort, --port     Keyrock server port
  --email, -e            Keyrock user's email                         [required]
  --password, -p         Keyrock user's password                      [required]
  --getKeyrockToken, -g  Get token to access Keyrock's own resources   [boolean]
  --help, -h             Show help                                     [boolean]


Use the token given after "Token for accessing Keyrock:" as the $KEYROCK_TOKEN in the following steps.

Next your should create the needed roles in Keyrock. 

There is a convinience Node app in the directory_scripts/create_policies_ that you can use to create the needed XACML rules based on FIWARE service, and if the user should have read or write access. The script expects that the user roles are named according to a certain templates, as the name of the user role is parsed to configure the access rule. The following user names have a meaning for the script:

| User name                   |  Permissions of the created access rules                      |
|-----------------------------|:-------------------------------------------------------------:|
| Admin                       | Full read and write access to all FIWARE services             |
| FIWARE_SERVICE_NAME reader  | Read access to FIWARE service FIWARE_SERVICE_NAME             |
| FIWARE_SERVICE_NAME writer  | Write access to FIWARE service FIWARE_SERVICE_NAME            |
| Read all services           | Read access to all services                                   |

You can get run the script in the directory with _npm start -- --help_. After you provide the required parameters, a directory 'access_policies' is created that holds the XACML access control rules. The rules are named following by the following template: appName + '-' + role.name + '_policies.xml'. But before you run the Node app, you must create the user roles for the applications in Keyrock.

Create a role in  Keyrock, assign it to user
-----------------------------------------------------
- get the users in the system
  curl 'http://YOUR_KEYROCK_HOST/v1/users' --header "X-Auth-token: $KEYROCK_TOKEN"
  Response is an array of users in the system, as we are using admin-level credentials:
  ...
    {
      "date_password": "2019-06-25T15:53:42.000Z",
      "description": null,
      "email": "user@semail.org",
      "enabled": true,
      "gravatar": false,
      "id": "USER_ID",
      "scope": [],
      "username": "user",
      "website": null
    },
  ...

- create a role 
  Giving the role name 'your fiware service name writer' would mean that the Node app in scripts/create_policies/access_policies would create access rules which gives the role write access to FIWARE service called 'your fiware service name'.

  creating a role - example request
    curl 'YOUR_KEYROCK_HOST/v1/applications/APPLICATION_ID/roles' --header "Content-Type: application/json" --header "X-Auth-token:
    $KEYROCK_TOKEN" -d '{"role": {"name": "your fiware service name writer"}}'

  creating a role - example response
    {"role":{"id":"ROLE_ID",
    "is_internal":false,
    "name":"your fiware service name writer",
    "oauth_client_id":"APPLICATION_ID"}

- assign a role to user in the application
  - request
      curl --include \
           --request POST \
           --header "Content-Type: application/json" \
           --header "X-Auth-token: $KEYROCK_TOKEN" \
        "YOUR_KEYROCK_HOST/v1/applications/APPLICATION_ID/users/USER_ID/roles/ROLE_ID"
  - response
    {"role_user_assignments":
      { "role_id":"ROLE_ID",
        "user_id":"USER_ID",
        "oauth_client_id":"APPLICATION_ID"
      }
    }

Now the role is associated with the user. The role's ID can be used as an attribute in XACML access rules. This is because Wilma gets the roles corresponding to a OAuth2 token in the client's request from Keyrock.

Create the new access rule and send it to AuthZForce
-----------------------------------------------------
If the XACML access rules created by the Node app in scripts/create_policies/access_policies do not meet your project's needs, you can create your own. This section gives you advice on how to proceed. 

XACML basics
--------------------------------------
https://www.oasis-open.org/committees/download.php/2713/Brief_Introduction_to_XACML.html

XACML is an OASIS standard that describes both a policy language and an access control decision request/response language (both written in XML).

Hierarchy of XACML access rule definition
-----------------------------------------
Domain
  PolicySet
    PolicySet (Policy/policySet combining algorithms)
    Policy (Rule combining algorithms)
      Target
      Rule
      Condition
        -  Condition represents a Boolean expression that refines the applicability of the rule beyond the predicates implied by its target. Therefore, it may be absent. 
      Attribute (Subject, Resource, Action, and Environment)
        AttributeSelector
          - uses XPath queries
        AttributeDesignator
          - own AttribureDesignators for Subject, Resource, Action, and Environment
          - set attribute name & value that is looked for in the access
        - multiple AttributeDesignators and AttributeSelectors can be combined by using Bags
      Functions
        - retrieved attribute values are compared using _functions_.


General structure of the Keyrock generated XACML access rules
--------------------------------------------------------------
  PolicySet
    Target: Everything
    Policy
      Target
        - Match ApplicationID
      Rule
        - Match /path/
        - Match HTTP method(s)
        - Match FIWARE headers (added by the actions in this file)
      Condition
        - compare roleID using XACML functions
        - functions: any-of, string-equal

There are four different XACML categories where when can add attributes to. These are used in both the access rules stored in AuthZForce PAP (here: the access rules created from policy_linted_original.xml files) and the access decision requests sent from Wilma PEP (lib/azf.js file). These categories are:
  1. Subject
    - here: the role ID(s)
    - in access decision request (azf.js):
      "Category":"urn:oasis:names:tc:xacml:1.0:subject-category:access-subject"
    - in access rules (policy_linted_original.xml):
      <ns3:AttributeDesignator Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" AttributeId="urn:oasis:names:tc:xacml:2.0:subject:role" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
  2. Resource
    - here: HTTP request's /path (for example /v2/entities), not including the query string
    - adding new resource attributes is where most of this work is concentrating on
    - in access decision request (azf.js):
      "Category":"urn:oasis:names:tc:xacml:3.0:attribute-category:resource"
    - in access rules (policy_linted_original.xml):
      <ns3:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" AttributeId="urn:oasis:names:tc:xacml:1.0:resource:resource-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
  3. Action
    - here: the HTTP method
    - in access decision request (azf.js):
      "Category":"urn:oasis:names:tc:xacml:3.0:attribute-category:action",
    - in access rules (policy_linted_original.xml):
      <ns3:AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
  4. Environment
    - not used here
    - in access decision request (azf.js):
      "Category":"urn:oasis:names:tc:xacml:3.0:attribute-category:environment"
    - in access rules (policy_linted_original.xml):
      not used

Remember that you can get the XACML for the access rules from application's domain in AuthZForce with

  curl YOUR_AUTHZFORCE_HOST/authzforce-ce/domains/APPLICATIONS_AUTHZFORCE_DOMAIN_ID/pap/policies/APPLICATIONS_POLICY_SET/VERSION_NUMBER_OF_THE_POLICY > your_access_xacml_access_rule.xml && xmllint --format your_access_xacml_access_rule.xml

Now you need to perform the following steps:
1. edit the XACML of the root policy select to reflect the new role's ID, and the give role some access rights
- before changes - request
      curl 'WILMA_PEP_PROXY_HOST/v2/entities' --header "X-Auth-token: $OAUTH2_TOKEN"
  before changes - response
      "User token not authorized"

- first changes to the "your_access_xacml_access_rule.xml"
  - change subject to the right role ID
  - increased policy set's version number by one, for example Version="2" -> Version="3"

  - send the modified policy set to AuthZForce
  curl -X POST YOUR_AUTHZFORCE_HOST/authzforce-ce/domains/APPLICATIONS_AUTHZFORCE_DOMAIN_ID/pap/policies --header "Content-Type: application/xml" --data-binary '@your_access_xacml_access_rule.xml'
- debug :-)

Fiware-Service and Fiware-Servicepath were added as new attributes to the the resource category for the access decion request. If you want to add new attributes, the Wilma Docker image has to be modified, see instructions in the file advanced_access_control/documents/build_wilma_with_fiware_header_support.txt.
- after successful changes to XACML access rules - request
    curl 'WILMA_PEP_PROXY_HOST/v2/entities' --header "X-Auth-token: $OAUTH2_TOKEN" --header "Fiware-service: your_fiware_service_name" --header "fiware-servicepath: /our/path/here§"
  the response from a FIWARE service with no entities
    []

Now we have functioning XACML access rules in AuthZForce PAP which are enforced by Wilma PEP.

I told you we would meet at the other side! Hope this access-to-only-the-permitted-areas journey for fruitful for you.