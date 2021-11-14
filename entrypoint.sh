#!/bin/sh -l

# echo "Hello $1"
# time=$(date)
# echo "::set-output name=time::$time"

python ./unf_url.py $1 $2 $3 $4
