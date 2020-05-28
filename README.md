This repository presents work done as a part of the [CityIoT project](https://www.cityiot.fi/english) in Tampere University. 

As part of the project a refence IoT platform was created. The repository for the reference platform [can be found from GitHub](https://github.com/cityiot/CityIoT-platform). The code can be used as part of the reference platform's access controls, but the platform can be used without code in this repository, and the code in this repository can be used without the platform. 

# FIWARE access controls

FIWARE Security GEs (Generic Enablers) sofware packages can be used to implement access control in FIWARE systems. Materials describing how to set up a system using these components and FIWARE Orion are in sub-directories 'basic_access_control' for basic access controls and 'advanced_access_control' for advanced access controls. 

## FIWARE security GEs
FIWARE [Catalogue](https://catalogue-server.fiware.org/chapter/security) lists three default Security GEs: Keyrock, Wilma, and AuthZForce. These three GEs seem to be the default in FIWARE setups, and are used in [official tutorials](https://fiwaretourguide.readthedocs.io/en/latest/security/introduction/).

Each of these three GEs is an actor that fills a specific role (or roles) in XACML (eXtensible Access Control Markup Language) standard. XACML is a standard for specifying the access control rules for a system. The standard includes the components, XML-schema for the rules, and the requests and responses used with the access control decisions. Link to [XACML standard](https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=xacml), link to [data-flow model](https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047089) showing the data flow between XACML components.

Keyrock idM (identity Manager) is an OAuth Authorization Endpoint, while Wilma is a PEP proxy (Policy Enforcement Point), and AuthZForce works as a PDP (Policy Decision Point), and a PAP (Policy Administration Point). These GEs and their roles are described in their own sections in this document.

### Keyrock idM
Main concepts and resources in Keyrock are:

- **Users**     - have an account in Keyrock, can manage organizations and register applications
- **Applications** - application has the client role in the OAuth 2.0 architecture, are able to authenticate users using the application's Oauth2 credentials (id and secret) which unequivocally identify the application.
- **Roles** - A role is defined in a application. The role is given permissions for functionality and data within the application. Users can be given be added to a role. Keyrock default roles are _Purchaser_ and _Provider_.
- **Permissions** - an unambiguous statement, which defines if a user or organization should be given permission to access certain functionality or data
- **Organizations** - group of users that share resources of an application (roles and permissions)

Keyrock can be used to authenticate the user, and check if the user is authorized to use an application defined in Keyrock. Keyrock also provides basic access controls that use HTTP method + URL path -combinations to to define access control rules for different roles and organizations.

Keyrock's API provides access to its resources on the same level as does the its administration web page's interface.

Links to Keyrock resources:

- Keyrock [FIWARE catalogue page](https://catalogue-server.fiware.org/enablers/identity-management-keyrock)
- Keyrock [documentation](https://fiware-idm.readthedocs.io/en/latest/)
- Keyrock [API](https://keyrock.docs.apiary.io/#reference/keyrock-api)
- Keyrock in [Docker Hub](https://hub.docker.com/r/fiware/idm/)
- Keyrock in [GitHub](https://github.com/ging/fiware-idm) (ging stands for _Grupo de Internet de Nueva Generación_, the group developing Keyrock)
- Keyrock idM [Docker image GitHub repository](https://github.com/ging/fiware-idm/tree/master/extras/docker), with instructions for use

### Wilma
Wilma PEP (Policy Enforcement Point) acts as proxy server, and it captures requests directed to other FIWARE GE's APIs, or to other RESTful services. After receiving a request Wilma creates an access control request which it sends to a PDP (Policy Decision Point) for a access control decision. Either Keyrock or AuthZForce can used as the PDP, based on the settings of the system.

Wilma expects either a Kestone or OAuth2 token value in request’s X-Auth-Token header, which it can use for user authorization. User can get a token by request to Keyrock.

For example, Wilma can be used to [secure access to Orion](https://fiware-tutorials.readthedocs.io/en/latest/pep-proxy/index.html#securing-the-orion-context-broker). After this requests to Orion are directed to Wilma's port on the host. To do this, first an app has to be created in Keyrock in which the Orion, and the PEP instance keys are defined. PEP keys are setup in the Keyrock per Application, and include Application ID, PEP Proxy username, and PEP Proxy password. These defined PEP keys have to be copied from Keyrock to Wilma settings, and can be placed either in Wilma's own configuration file, or in docker-compose.yml environment variables.

Only thing stated about Wilma's API in its documentation is this: "Requests to proxy should be made with a special HTTP Header: X-Auth-Token. This header contains the OAuth access token obtained from FIWARE IDM GE."

Links to Wilma resources:

- Wilma in [FIWARE Catalogue](https://catalogue-server.fiware.org/enablers/pep-proxy-wilma)
- Wilma [documentation](http://fiware-pep-proxy.readthedocs.org/en/latest/)
- Wilma in [Docker Hub](https://hub.docker.com/r/ging/fiware-pep-proxy/)
- Wilma in [GitHub](https://github.com/ging/fiware-pep-proxy)

### AuthZForce PDP & PAP (Policy Decision Point & Policy Administration Point)
As previously stated, AuthZForce works as a PAP (Policy Administration Point) and a PDP (Policy Decision Point). As a PAP, the AuthZForce stores the created access policies. As a PDP AuthZForce gets access control decision requests from Wilma, and replies to them based on the stored access control policies.

AuthzForce is the reference implementation of the Authorization PDP Generic Enabler. It should enable more flexibility in defining accees control policies, when compared to Keyrock. XACML access policies are attribute based, attributes can be attributes of:
- _Subject_ (the originator of the request)
- requested _Resource_,
- _Action_ related to the resource
- _Environment_

Links to AuhtZforce resources:

- AuthZForce in [FIWARE Catalogue](https://catalogue-server.fiware.org/enablers/authorization-pdp-authzforce)
- AuthZForce [documentation](https://authzforce-ce-fiware.readthedocs.io/en/latest/)
- AuhtZForce [API in Apiry](https://authorizationpdp.docs.apiary.io/)
- AuthZForce in [Docker Hub](https://hub.docker.com/r/fiware/authzforce-ce-server/)
- AuthZForce in [GitHub](https://github.com/authzforce/fiware)

## Implementing basic (level 2) and advanced (level 3) access control with FIWARE
FIWARE has [three levels of access control](https://fiware-tutorials.readthedocs.io/en/latest/securing-access/index.html#pdp-access-control). These three levels are:

  - Level 1: Authentication Access - Allow all actions to every signed in user and no actions to an anonymous user.
  - Level 2: Basic Authorization - Check which resources and verbs the currently logged in user should have access to
  - Level 3: Advanced Authorization - Fine grained control through XACML

The first two levels can be achieved with Keyrock, while the third level demands using Wilma and AuthZForce.

In CityIoT documents there levels are called _basic level_ for level 2 with Keyrock and Wilma, and _advanced level_ for level 3 which also includes AuthZForce.

Example implementations of level 2 and level 3 of access control implementations are available in sub-directories 'basic_access_control' and 'advanced_access_control'.

### OAuth2 in FIWARE access control
[OAut2 grant types](https://oauth.net/2/grant-types/) available for applications in Keyrock are Authorization Code, Implicit, Resource Owner Password Credentials, and Client Credentials (for more information about them, see [RFC 6749](https://tools.ietf.org/html/rfc6749)). Of the OAut2 grant types the [Resource Owner Password Credentials](https://oauth.net/2/grant-types/password/) is used in the steps described in this document. It is relatively insecure, but fits the use case here.

### Docker Compose and setting files for both levels
User has to have both Docker and Docker Compose installed.

Docker Compose files used for basic and advanced levels can be found in this repo:

- Basic: /platform/experiments/fiware_access_control/basic_access_control/docker-compose-basic-level.yml
- Advanced: /platform/experiments/fiware_access_control/advanced_access_control/docker-compose--advanced-level.yml

Settings files for Keyrock and Wilma are in this repo,too:
Basic access control:

- Keyrock IDM configuration: /platform/experiments/fiware_access_control/basic_access_control/config/keyrock_config7.7.js
- Wilma PEP configuration: /platform/experiments/fiware_access_control/basic_access_control/config/wilma_config7.7.js

Advanced access control:

- Keyrock IDM configuration: /platform/experiments/fiware_access_control/advanced_access_control/config/keyrock_config7.7.js
- Wilma PEP configuration: /platform/experiments/fiware_access_control/advanced_access_control/config/wilma_config7.7.js

## Next steps
It is suggested that as a next step you now go to the _/platform/experiments/fiware_access_control/basic_access_control/_ directory and try the basic level 2 access control Docker compose, as is described in the README.md in that directory. From the basic level setup you can move on to the advanced access control setup, which you can find in the _/platform/experiments/fiware_access_control/advanced_access_control/_ directory. 

Good luck and I'll see you on the other side! :-)
