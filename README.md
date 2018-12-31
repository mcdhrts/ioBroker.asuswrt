![Logo](admin/asuswrt.png)
# ioBroker.asuswrt
=================

[![NPM version](http://img.shields.io/npm/v/iobroker.asuswrt.svg)](https://www.npmjs.com/package/iobroker.asuswrt)
[![Downloads](https://img.shields.io/npm/dm/iobroker.asuswrt.svg)](https://www.npmjs.com/package/iobroker.asuswrt)
[![Tests](https://api.travis-ci.org/mcdhrts/ioBroker.asuswrt.svg)](https://travis-ci.org/mcdhrts/ioBroker.asuswrt)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://github.com/mcdhrts/ioBroker.asuswrt/blob/master/LICENSE)

[![NPM](https://nodei.co/npm/iobroker.asuswrt.png?downloads=true)](https://nodei.co/npm/iobroker.asuswrt/)

ASUSWRT adapter for ioBroker
------------------------------------------------------------------------------

Find Active Devices in ASUS Routers running ASUSWRT. 
You can use this for Example as Presence Detection of Phones to track if someone is at home.

Tested with Asus GT-AC5300 running ASUSWRT 3.0.0.4.384_32799

You can find a list from Asus which Router DO NOT use ASUSWRT here: https://event.asus.com/2013/nw/ASUSWRT/

You must activate and allow SSH Connections in your Router Settings

## Setup
1. Asus Router IP-Address: The IP-Address of the Asus Router
2. Login User: The User Name for the Asus Router
3. Login Password: The Passwort for the User to login
4. SSH-Port: The Port for the SSH Connection to the Asus Router
4. SSH-Type: Which SSH-Type the Adapter should Use. SSH2 keeps the SSH Session alive, SIMPLE-SSH makes a new SSH Session for every SSH Command. SSH2 is recommended
6. Polling Time: The Time in ms to check for active Devices (SSH2: Mininum time is 10000ms = 10s, SIMPLE-SSH: Mininum time is 60000ms = 60s = 1 Minute)
7. Time Not Active: The Time in ms when a Device is not active anymore. In my case 180000ms = 180s = 3 Minutes works perfectly. Minimum is 60000ms
8. Addresses to monitoring: Add the Devices to watch if active or not with the MAC-Address from the Device. Set the Checkbox for active to activate the monitoring

## Changelog

### 0.3.0 (2018-12-31)
* (mcdhrts) Code Review Changes, when using SSH2 Polling Intervall is lower to now minimum 10s

### 0.2.1 (2018-12-29)
* (mcdhrts) Update Readme and add missing translations

### 0.2.0 (2018-12-17)
* (mcdhrts) Possibilty to use SSH2 which keeps the SSH Session to the Router alive

### 0.1.2 (2018-12-10)
* (mcdhrts) Update wrong dependencies

### 0.1.1 (2018-12-10)
* (mcdhrts) Update README

### 0.1.0 (2018-12-10)
* (mcdhrts) first complete checked and running beta Version

### 0.0.1 (2018-12-09)
* (mcdhrts) first official beta version
