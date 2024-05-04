#!/bin/bash
SUBSCRIPTION="435c0591-eed0-48e5-84a0-287a2e83e0d7"
GROUPNAME="justabowl"

echo Ensuring api deployment
az deployment group create --subscription $SUBSCRIPTION --resource-group "$GROUPNAME" --template-file api.bicep
