#!/bin/bash

scp -i /home/eric/.ssh/id_rsa /etc/letsencrypt/live/track.utahvalleypinewoodderby.com/* pi@track.utahvalleypinewoodderby.com:/home/pi/track/certificates/.

