# Copyright 2019 Tampere University
# This software was developed as a part of the CityIoT project: https://www.cityiot.fi/english
# This source code is licensed under the 3-clause BSD license. See license.txt in the repository root directory.
# Author(s): Ville Heikkilä <ville.heikkila@tuni.fi>

import json
import sys

RULE_TEMPLATE = \
"""<Rule RuleId="{rule_id:}" Effect="Permit">
    <Description>{rule_description:}</Description>
    <Target>
        <AnyOf>{path_rules:}
        </AnyOf>
        <AnyOf>{method_rules:}
        </AnyOf>
    </Target>
{role_condition:}
</Rule>"""

ROLE_CONDITION_TEMPLATE = \
"""    <Condition>
        <Apply FunctionId="urn:oasis:names:tc:xacml:3.0:function:any-of">
            <Function FunctionId="urn:oasis:names:tc:xacml:1.0:function:string-equal"/>
            <AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">{role_id:}</AttributeValue>
            <AttributeDesignator Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" AttributeId="urn:oasis:names:tc:xacml:2.0:subject:role" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
        </Apply>
    </Condition>"""

PATH_RULE_TEMPLATE = \
"""
            <AllOf>
                <Match MatchId="urn:oasis:names:tc:xacml:1.0:function:{string_match_method:}">
                    <AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">{path_string:}</AttributeValue>
                    <AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" AttributeId="urn:thales:xacml:2.0:resource:sub-resource-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                </Match>
            </AllOf>"""

METHOD_RULE_TEMPLATE = \
"""
            <AllOf>
                <Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                    <AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">{request_method:}</AttributeValue>
                    <AttributeDesignator Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="true"/>
                </Match>
            </AllOf>"""


def get_string_match_method(is_regex: bool):
    if is_regex:
        return "string-regexp-match"
    else:
        return "string-equal"


def get_xacml(rule_info):
    rule_id = rule_info["rule_id"]
    rule_description = rule_info.get("rule_description", "No description.")
    role_id = rule_info.get("role_id", None)
    path_rules = rule_info.get("path_rules", [])
    method_rules = rule_info.get("method_rules", [])

    if role_id is None:
        role_condition_xacml = ""
    else:
        role_condition_xacml = ROLE_CONDITION_TEMPLATE.format(role_id=role_id)

    path_rules_xacml = ""
    for path_rule in path_rules:
        path_rules_xacml += PATH_RULE_TEMPLATE.format(
            path_string=path_rule["path"],
            string_match_method=get_string_match_method(path_rule.get("is_regex", False)))

    method_rules_xacml = ""
    for method_rule in method_rules:
        method_rules_xacml += METHOD_RULE_TEMPLATE.format(request_method=method_rule)

    return RULE_TEMPLATE.format(
        rule_id=rule_id,
        rule_description=rule_description,
        role_condition=role_condition_xacml,
        path_rules=path_rules_xacml,
        method_rules=method_rules_xacml)


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ["--file", "--string"]:
        print(sys.argv[0].split("/")[-1].split("\\")[-1].split(".py")[0],
              "<input method>", "<json file name OR rule info as json string>")
        print("  input method =", "--file", "OR", "--string")
        quit()

    if sys.argv[1] == "--file":
        with open(sys.argv[2], mode="r") as json_file:
            rule_info = json.load(json_file)
    else:
        rule_info = json.loads(sys.argv[2])

    xacml_rule = get_xacml(rule_info)
    print(xacml_rule)
