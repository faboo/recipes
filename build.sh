#!/bin/bash

~/me/widgy/preprocess.sh src dist

cd dist

zip -rn .swp:.swo ../recipes.zip *
