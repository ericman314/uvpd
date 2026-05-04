#!/bin/bash

cd /home/pi/track

npm install

forever restart server.js || forever start server.js
