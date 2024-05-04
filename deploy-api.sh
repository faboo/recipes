#!/bin/bash
SUBSCRIPTION="435c0591-eed0-48e5-84a0-287a2e83e0d7"
GROUPNAME="justabowl"
FUNCAPP_NAME=`az functionapp list | jq '.[] | .name' | grep api | sed 's/"//g'`

OLDGROUP=$(az configure --list-defaults -o tsv | grep -e '^group' | sed 's/^[^\t]*//')
echo Old Group: $OLDGROUP
az configure --defaults group=$GROUPNAME
az configure --list-defaults -o tsv

trap "az configure --defaults group=$OLDGROUPNAME" EXIT

cd api

# Need to write a fully expanded list of ignored files because - despite what the documentation says - it does not
# conform to the .gitignore format.
echo Writing funcignore
git ls-files --cached --others --ignored --exclude-from=funcignore > .funcignore

echo Deploying code to $FUNCAPP_NAME
time func azure functionapp publish "$FUNCAPP_NAME" --subscription $SUBSCRIPTION

