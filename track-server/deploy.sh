#!/bin/bash

cd "/home/eric/Documents/pinewood"

rsync -av --exclude 'node_modules' --exclude 'config.json' --exclude 'cars/' . pi@track.utahvalleypinewoodderby.com:~/track/.


ssh pi@track.utahvalleypinewoodderby.com '~/track/post-deploy.sh'
