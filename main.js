/*
 *      ioBroker ASUSWRT Adapter
 */

'use strict';

//SSH2
var Client = require('ssh2').Client;
var conn = new Client();

//OTHER
const utils = require('@iobroker/adapter-core');
const deviceCommand = 'PATH=$PATH:/bin:/usr/sbin:/sbin && ip neigh';
const fs = require('fs');

//Maybe in future releases
//const clearIPCacheCommand = 'ip -s -s neigh flush all';

var timer = null;
var stopTimer = null;
var isStopping = false;
var stopExecute = false;
var lastTimeUpdateDevices = 0;
var host  = '';
var useKeyFile = false;

let adapter;
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'asuswrt',

        ready: function () {
            main();
        },

        unload: function (callback) {
            if (timer) {
                clearInterval(timer);
                timer = 0;
            }
            isStopping = true;
            callback && callback();
        },

        objectChange: function (id, obj) {
            adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
        }
    });

    adapter = new utils.Adapter(options);
    return adapter;
};

function stop() {
    if (stopTimer) clearTimeout(stopTimer);

    // Stop only if schedule mode
    if (adapter.common && adapter.common.mode == 'schedule') {
        stopTimer = setTimeout(function () {
            stopTimer = null;
            if (timer) clearInterval(timer);
            isStopping = true;
            adapter.stop();
        }, 30000);
    }
}

process.on('SIGINT', function () {
    if (timer) clearTimeout(timer);
});

function createDevice(name, mac, callback) {
    let id = mac.replace(/:/g, "").toLowerCase();

    adapter.setObjectNotExists(id, {
        type: 'device',
        common: {
            name: name || mac
        },
        native: {
            mac: mac
        }
    }, () => {
        const states = [
            {
                id: 'last_time_seen_active',
                common: {
                    name: name || mac,
                    def: '-',
                    type: 'string',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'last update'
                }
            },
            {
                id: 'ip_address',
                common: {
                    name: name || mac,
                    def: '',
                    type: 'string',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'Last known IP Address'
                }
            },
            {
                id: 'mac',
                common: {
                    name: name || mac,
                    def: mac,
                    type: 'string',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'MAC address'
                }
            },
            {
                id: 'last_status',
                common: {
                    name: name || mac,
                    def: '',
                    type: 'string',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'last known status'
                }
            },
            {
                id: 'active',
                common: {
                    name: name || mac,
                    def: false,
                    type: 'boolean',
                    read: true,
                    write: false,
                    role: 'value',
                    desc: 'Device Active'
                }
            }
        ];

        states.forEach(state => {
            adapter.setObjectNotExists(id + '.' + state.id, {
                type: 'state',
                common: state.common,
                native: {
                    mac: id
                }
            }, callback);
        });

        adapter.log.debug(id + ' generated ' + mac);
    });
}

function syncConfig(callback) {
    adapter.getStatesOf('', host, function (err, _states) {
        let configToDelete = [];
        let configToAdd    = [];
        let k;
        let id;
        if (adapter.config.devices) {
            for (k = 0; k < adapter.config.devices.length; k++) {
                configToAdd.push(adapter.config.devices[k].mac);
            }
        }

        let tasks = [];

        if (_states) {
            for (var j = 0; j < _states.length; j++) {
                let mac = _states[j].native.mac;
                if (!mac) {
                    adapter.log.warn('No mac address found for ' + JSON.stringify(_states[j]));
                    continue;
                }
                id = mac.replace(/:/g,"");
                id = id.toLowerCase();
                let pos = configToAdd.indexOf(mac);
                if (pos != -1) {
                    configToAdd.splice(pos, 1);
                    for (var u = 0; u < adapter.config.devices.length; u++) {
                        if (adapter.config.devices[u].mac == mac) {
                            if (_states[j].common.name !== (adapter.config.devices[u].name || adapter.config.devices[u].mac)) {
                                tasks.push({
                                    type: 'extendObject',
                                    id:   _states[j]._id,
                                    data: {common: {name: (adapter.config.devices[u].name || adapter.config.devices[u].mac), read: true, write: false}}
                                });
                            } else if (typeof _states[j].common.read !== 'boolean') {
                                tasks.push({
                                    type: 'extendObject',
                                    id:   _states[j]._id,
                                    data: {common: {read: true, write: false}}
                                });
                            }
                        }
                    }
                } else {
                    configToDelete.push(mac);
                }
            }
        }

        if (configToDelete.length) {
            for (var e = 0; e < configToDelete.length; e++) {
                id = configToDelete[e].replace(/:/g,"");
                id = id.toLowerCase();
                tasks.push({
                    type: 'delObject',
                    id: id
                });
            }
        }

        processTasks(tasks, function () {
            let count = 0;
            if (configToAdd.length) {
                for (var r = 0; r < adapter.config.devices.length; r++) {
                    if (configToAdd.indexOf(adapter.config.devices[r].mac) !== -1) {
                        count++;
                        createDevice(adapter.config.devices[r].name, adapter.config.devices[r].mac, function () {
                            if (!--count && callback) {
                                callback();
                            }
                        });
                    }
                }
            }
            if (!count && callback) callback();
        });
    });
}

function processTasks(tasks, callback) {
    if (!tasks || !tasks.length) {
        callback && callback();
    } else {
        var task = tasks.shift();
        var timeout = setTimeout(function () {
            adapter.log.warn('please update js-controller to at least 1.2.0');
            timeout = null;
            processTasks(tasks, callback);
        }, 1000);

        if (task.type === 'extendObject') {
            adapter.extendObject(task.id, task.data, function (/* err */) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                    setImmediate(processTasks, tasks, callback);
                }
            });
        } else if (task.type === 'delObjekt') {
            adapter.delObject(task.id, function (/* err */) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                    setImmediate(processTasks, tasks, callback);
                }
            });
        } else {
            adapter.log.error('Unknown task name: ' + JSON.stringify(task));
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
                setImmediate(processTasks, tasks, callback);
            }
        }
    }
}

function getActualDateTime() {
    let today = new Date();
    let hh = today.getHours();
    let mm = today.getMinutes();
    let ss = today.getSeconds();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let day = today.getDate();

    if (hh < 10) {
        hh = '0' + hh;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    if (ss < 10) {
        ss = '0' + ss;
    }

    let returntext = year + '.' + month + '.' + day + ' ' + hh + ':' + mm + ':' + ss;

    return returntext;
}

function setDeviceActive(mac,macArray,arraystdout) {
    if (macArray.indexOf(mac) != -1) {
        let realmac = arraystdout[4];
        let ip_address = arraystdout[0];
        let actualstatus = arraystdout[5];
        let lastupdate = getActualDateTime();

        adapter.setState(mac + '.last_time_seen_active' , lastupdate   || '-1'       , true);
        adapter.setState(mac + '.ip_address'            , ip_address   || 'undefined', true);
        adapter.setState(mac + '.mac'                   , realmac      || 'undefined', true);
        adapter.setState(mac + '.last_status'           , actualstatus || 'undefined', true);
        adapter.setState(mac + '.active'                , true         || 'undefined', true);

        adapter.log.debug('Device ' + mac + ' is active');
    }
}

function checkActiveDevices(macArray) {
    let arraylength = macArray.length;
    if (arraylength > 0) {
        for (var i = 0; i < arraylength; i++) {
            let mac = macArray[i];
            mac = mac.toLowerCase();
            checkDevice(mac);
        }
    }
}

function checkDevice(mac) {
    adapter.log.debug('Check ' + mac + ' if still active');
    adapter.getState(mac + '.active', function (err, state) {
        if (state) {
            if (state.val == true) {
                adapter.getState(mac + '.last_time_seen_active', function (err, updatestate) {
                    if (updatestate) {
                        let date = new Date();
                        let timenow = date.getTime();

                        let timebefore = updatestate.lc;
                        adapter.log.debug('Last Time Device Changed: ' + timebefore + ', now: ' + timenow);
                        let timeelapsed = timenow - timebefore;
                        if (lastTimeUpdateDevices != 0 && lastTimeUpdateDevices < timenow) {
                            let timebuffer = timenow - lastTimeUpdateDevices;
                            timeelapsed = timeelapsed - timebuffer;
                        }

                        if (timeelapsed > adapter.config.active_interval) {
                            adapter.setState(mac + '.active', false);
                            adapter.setState(mac + '.last_status', 'offline');
                            adapter.log.debug('Device ' + mac + ' is not active anymore');
                        }
                    }
                });
            }
        }
    });
}

function startCheckActiveDevices(hosts) {
    if (stopTimer) clearTimeout(stopTimer);
    adapter.log.debug('Start check if Device still active');
    if (!isStopping)  {
        checkActiveDevices(hosts);
        setTimeout(function () {
            startCheckActiveDevices(hosts);
        }, 30000);
    };
}

function setLastUpdateTime() {
    let date = new Date();
    lastTimeUpdateDevices = date.getTime();
}

function startUpdateDevicesSSH2(hosts) {
    try {
        if (useKeyFile) {
            if (adapter.config.keyfile_passphrase != "") {
                conn.connect({
                    host: adapter.config.asus_ip,
                    port: Number(adapter.config.ssh_port),
                    username: adapter.config.asus_user,
                    privateKey: fs.readFileSync(adapter.config.keyfile),
                    passphrase: adapter.config.keyfile_passphrase,
                    keepaliveInterval: 60000,
                });
            } else {
                conn.connect({
                    host: adapter.config.asus_ip,
                    port: Number(adapter.config.ssh_port),
                    username: adapter.config.asus_user,
                    privateKey: fs.readFileSync(adapter.config.keyfile),
                    keepaliveInterval: 60000,
                });
            }
        } else {
            conn.connect({
                host: adapter.config.asus_ip,
                port: Number(adapter.config.ssh_port),
                username: adapter.config.asus_user,
                password: adapter.config.asus_pw,
                keepaliveInterval: 60000,
            });
        }
    } catch (error) {
        adapter.log.error(error);
        stop();
        return;
    }

    conn.on('ready', function() {
        adapter.log.info('SSH Connection to Router is ready, starting Device Checking');
        stopExecute = false;
        startCommandSSH2(hosts);
    });
}

function startCommandSSH2(hosts) {
    if (stopTimer) clearTimeout(stopTimer);
    if (!isStopping) {
        if (stopExecute === false) {
            updateDeviceSSH2(hosts);
            setLastUpdateTime();
            setTimeout(function () {
                startCommandSSH2(hosts);
            }, adapter.config.interval);
        }
    }
}

function updateDeviceSSH2(macArray) {
    try {
        conn.exec(deviceCommand, function(err, stream) {
            if (err) throw err;
            stream.on('data', function(data) {
                let arraystdout = String(data);
                arraystdout = arraystdout.split(" ");
                if (arraystdout.length == 6) {
                    let mac = arraystdout[4].replace(/:/g,"");
                    mac = mac.toLowerCase();
                    setDeviceActive(mac,macArray,arraystdout);
                }
                adapter.log.debug('STDOUT: ' + data);
            }).stderr.on('data', function(data) {
                adapter.log.debug('STDERR: ' + data);
            });
        });
    } catch (error) {
        if (String(error) === 'Error: Not connected') {
            adapter.log.error('SSH2 is not connected, try new Connection in 90s');
            stopExecute = true;
            setTimeout(function () {
                restartSSH2(macArray);
            }, 90000);
        } else {
            adapter.log.error(error);
            stopExecute = true;
        }
    }
}

function restartSSH2(hosts) {
    conn = null;
    conn = new Client();
    startUpdateDevicesSSH2(hosts);
}

function getActiveDevices(hosts) {
    if (stopTimer) clearTimeout(stopTimer);

    if (!hosts) {
        hosts = [];
        for (var i = 0; i < adapter.config.devices.length; i++) {
            if (adapter.config.devices[i].mac.length > 11) {
                if (adapter.config.devices[i].active) {
                    let mac = adapter.config.devices[i].mac.replace(/:/g,"");
                    mac = mac.toLowerCase();
                    hosts.push(mac);
                }
            }
        }
    }

    if (!hosts.length) {
        adapter.log.error('No Devices to watch found or no Devices set with active');
        stop();
        return;
    }

    let checkRouterAddress = validateIPaddress(adapter.config.asus_ip) || validateHostname(adapter.config.asus_ip);
    if (!checkRouterAddress) {
        adapter.log.error('The Server-Address ' + adapter.config.asus_ip + ' is neither a valid IP-Address or Hostname');
        stop();
        return;
    }

    if (adapter.config.keyfile != "") {
        fs.stat(adapter.config.keyfile, function(err) {
            if (err) {
                adapter.log.info('Key File ' + adapter.config.keyfile + 'not found, try to use Password instead');
                adapter.log.info('File Error Message: ' + err);
                if (adapter.config.asus_pw === "") {
                    adapter.log.error('No Key File and No Password set for the SSH Connection');
                    stop();
                    return;
                }
                useKeyFile = false;
            } else {
                useKeyFile = true;
            }
        })
    } else {
        if (adapter.config.asus_pw === "") {
            adapter.log.error('No Key File and No Password set for the SSH Connection');
            stop();
            return;
        }
        useKeyFile = false;
    }

    // polling mininum 5 Seconds for SSH2
    if (adapter.config.interval < 5000) { adapter.config.interval = 5000; }

    setTimeout(function () {
        startUpdateDevicesSSH2(hosts);
    }, 5000);

    setTimeout(function () {
        startCheckActiveDevices(hosts);
    }, 30000);
}

function validateIPaddress(inputText) {
    const ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return !!inputText.match(ipformat);
}

/**
 * Validates if the input is a hostname checked by regex
 * @param {string} inputText
 * @returns {boolean}
 */
function validateHostname(inputText) {
    const validHostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
    return !!inputText.match(validHostnameRegex);
}

function main() {
    if (!adapter.config.devices) {
        adapter.log.info('No Devices to watch configured');
        stop();
        return;
    }

    adapter.config.interval = parseInt(adapter.config.interval, 10);
    adapter.config.active_interval = parseInt(adapter.config.active_interval, 10);

    // Active Intervall mininum 60 Seconds
    if (adapter.config.active_interval < 60000) {
        adapter.config.active_interval = 60000;
    }

    syncConfig(function () {
        getActiveDevices();
    });
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
