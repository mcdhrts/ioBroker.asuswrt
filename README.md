![Logo](admin/asuswrt.png)
# ioBroker.asuswrt
=================

[![NPM version](http://img.shields.io/npm/v/iobroker.asuswrt.svg)](https://www.npmjs.com/package/iobroker.asuswrt)
[![Downloads](https://img.shields.io/npm/dm/iobroker.asuswrt.svg)](https://www.npmjs.com/package/iobroker.asuswrt)

[![NPM](https://nodei.co/npm/iobroker.asuswrt.png?downloads=true)](https://nodei.co/npm/iobroker.asuswrt/)

ASUSWRT adapter for ioBroker
------------------------------------------------------------------------------

Find Active Devices in ASUS Routers running ASUSWRT

Setup
------------------------------------------------------------------------------
*Asus Router IP-Address: The IP-Address of the Asus Router
*Login User: The User Name for the Asus Router
*Login Password: The Passwort for the User to login
*SSH-Port: The Port for the SSH Connection to the Asus Router
*Polling Time: The Time in ms to check for active Devices (for now the mininum time is 60000ms = 60s = 1 Minute)
*Time Not Active: The Time in ms when a Device is not active anymore. In my case 180000ms = 180s = 3 Minutes works perfectly. Minimum is 60000ms

Tested with Asus GT-AC5300 running ASUSWRT 3.0.0.4.384_32799
 
## Changelog

### 0.1.1 (2018-12-10)
* (mcdhrts) Update README

### 0.1.0 (2018-12-10)
* (mcdhrts) first complete checked and running beta Version

### 0.0.1 (2018-12-09)
* (mcdhrts) first official beta version
