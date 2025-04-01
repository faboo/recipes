#!/bin/bash

widgy/preprocess.sh src dist

cp staticwebapp.config.json dist

cd dist

#zip -rn .swp:.swo ../recipes.zip *
