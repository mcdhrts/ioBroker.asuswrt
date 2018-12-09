/**
 *
 *      ioBroker ASUSWRT Adapter
 *
 *      (c) 2018 MCD_HRTS 
 *
 *      MIT License
 *
 */

'use strict';
//const SSH2 = require('ssh2');
const simpleSSH = require('simple-ssh');
const utils = require(__dirname + '/lib/utils');
const deviceCommand = 'PATH=$PATH:/bin:/usr/sbin:/sbin && ip neigh';

var result;
var err;
var timer = null;
var stopTimer = null;
var isStopping = false;
var lastTimeUpdateDevices = 0;

var adapter = new utils.Adapter({
    name: 'asuswrt',
    ready: function () {
        main();
    }
});

adapter.on('unload', function () {
    if (timer) {
        clearInterval(timer);
        timer = 0;
    }
    isStopping = true;
});

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

var host  = ''; // Name of the PC, where the ping runs

adapter.on('objectChange', function (id, obj) {
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

adapter.on('stateChange', function (id, state) {
    //nothing TO-DO
});

process.on('SIGINT', function () {
    if (timer) clearTimeout(timer);
});

function createState(name, mac, callback) {
    var id = mac.replace(/:/g,"");
    id = id.toLowerCase();
    
    adapter.createState('', id, 'last_time_seen_active', {
        name: name || mac,
        def: -1,
        type: 'string',
        read: 'true',
        write: 'true',
        role: 'value',
        desc: 'last update'
    }, {
        mac: id
    }, callback);

    adapter.createState('', id, 'ip_address', {
        name: name || mac,
        def: '',
        type: 'string',
        read: 'true',
        write: 'true',
        role: 'value',
        desc: 'Last known IP Address'
    }, {
        mac: id
    }, callback);

    adapter.createState('', id, 'mac', {
        name: name || mac,
        def: mac,
        type: 'string',
        read: 'true',
        write: 'true',
        role: 'value',
        desc: 'MAC address'
    }, {
        mac: id
    }, callback);

    adapter.createState('', id, 'last_status', {
        name: name || mac,
        def: '',
        type: 'string',
        read: 'true',
        write: 'true',
        role: 'value',
        desc: 'last known status'
    }, {
        mac: id
    }, callback);

    adapter.createState('', id, 'active', {
        name: name || mac,
        def: 'false',
        type: 'boolean',
        read: 'true',
        write: 'true',
        role: 'value',
        desc: 'Device Active'
    }, {
        mac: id
    }, callback);

    adapter.log.debug(id + ' generated ' + mac);
}

function addState(name, mac, callback) {
    adapter.getObject(host, function (err, obj) {
        createState(name, mac, callback);
    });
}

function syncConfig(callback) {
    adapter.getStatesOf('', host, function (err, _states) {
        var configToDelete = [];
        var configToAdd    = [];
        var k;
        var id;
        if (adapter.config.devices) {
            for (k = 0; k < adapter.config.devices.length; k++) {
                configToAdd.push(adapter.config.devices[k].mac);
            }
        }

        var tasks = [];

        if (_states) {
            for (var j = 0; j < _states.length; j++) {
                var mac = _states[j].native.mac;
                if (!mac) {
                    adapter.log.warn('No mac address found for ' + JSON.stringify(_states[j]));
                    continue;
                }
                id = mac.replace(/:/g,"");
                id = id.toLowerCase();
                var pos = configToAdd.indexOf(mac);
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
                    type: 'deleteState',
                    id:   id
                });
            }
        }

        processTasks(tasks, function () {
            var count = 0;
            if (configToAdd.length) {
                for (var r = 0; r < adapter.config.devices.length; r++) {
                    if (configToAdd.indexOf(adapter.config.devices[r].mac) !== -1) {
                        count++;
                        addState(adapter.config.devices[r].name, adapter.config.devices[r].mac, function () {
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
        } else  if (task.type === 'deleteState') {
            adapter.deleteState('', host, task.id, function (/* err */) {
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
    var today = new Date();
    var hh = today.getHours();
    var mm = today.getMinutes();
    var ss = today.getSeconds();
    var year = today.getFullYear();
    var month = today.getMonth() + 1;
    var day = today.getDate();

    if (hh < 10) {
        hh = '0' + hh;
    }
    
    if (mm < 10) {
        mm = '0' + mm;
    }
    
    if (ss < 10) {
        ss = '0' + ss;
    }

    var returntext = year + '.' + month + '.' + day + ' ' + hh + ':' + mm + ':' + ss;

    return returntext;
}

function updateDevice(macArray) {
    var ssh = new simpleSSH({
        host: adapter.config.asus_ip,
        user: adapter.config.asus_user,
        pass: adapter.config.asus_pw,
        port: Number(adapter.config.ssh_port)
    });
        
    ssh.exec(deviceCommand, {
        out: function(stdout) {
            var arraystdout = stdout.split(" ");
            if (arraystdout.length == 6) {                                
                var mac = arraystdout[4].replace(/:/g,"");  
                mac = mac.toLowerCase();
                setDeviceActive(mac,macArray,arraystdout);
            }
        }
    }).start();
}

function setDeviceActive(mac,macArray,arraystdout) {
    //adapter.log.info('MacArray: ' + macArray + ', check for MAC: ' + mac);
    if (macArray.indexOf(mac) != -1) {
        var realmac = arraystdout[4];
        var ip_address = arraystdout[0];
        var actualstatus = arraystdout[5];              
        var lastupdate = getActualDateTime();
    
        adapter.setState(mac + '.last_time_seen_active' , lastupdate   || '-1'       , true);
        adapter.setState(mac + '.ip_address'            , ip_address   || 'undefined', true);
        adapter.setState(mac + '.mac'                   , realmac      || 'undefined', true);
        adapter.setState(mac + '.last_status'           , actualstatus || 'undefined', true);
        adapter.setState(mac + '.active'                , true         || 'undefined', true);                    
    
        adapter.log.debug('Refresh ' + mac + ' update = ' + lastupdate);   
    }
}

function checkActiveDevices(macArray) {
    var arraylength = macArray.length;
    if (arraylength > 0) {
        for (var i = 0; i < arraylength; i++) {
            var mac = macArray[i];
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
                        var date = new Date(); 
                        var timenow = date.getTime();
                        
                        var timebefore = updatestate.lc;
                        //adapter.log.debug('Letzte Change: ' + timebefore + ', now: ' + timenow);
                        var timeelapsed = timenow - timebefore;
                        if (lastTimeUpdateDevices != 0 && lastTimeUpdateDevices < timenow) {
                            var timebuffer = timenow - lastTimeUpdateDevices;
                            timeelapsed = timeelapsed - timebuffer;
                        }
                    
                        if (timeelapsed > adapter.config.active_interval) {
                            adapter.setState(mac + '.active', false);
                            adapter.setState(mac + '.last_status', 'offline');
                            adapter.log.info('Device ' + mac + ' is not active anymore');
                        }
                    }
                });    
            }
        }
    });  
}

function startUpdateDevices(hosts) {
    if (stopTimer) clearTimeout(stopTimer);
    setLastUpdateTime();
    //adapter.log.info('Start Update active Devices'); 
    if (!isStopping)  {
        updateDevice(hosts);
        setTimeout(function () {
            startUpdateDevices(hosts);
        }, adapter.config.interval);
    };      
}

function startCheckActiveDevices(hosts) {
    if (stopTimer) clearTimeout(stopTimer);
    //adapter.log.info('Start check if Device still active'); 
    if (!isStopping)  {
        checkActiveDevices(hosts); 
        setTimeout(function () {
            startCheckActiveDevices(hosts);
        }, 30000);
    };         
}

function setLastUpdateTime() {
    var date = new Date(); 
    lastTimeUpdateDevices = date.getTime();
}

function getActiveDevices(hosts) {
    if (stopTimer) clearTimeout(stopTimer);

    if (!hosts) {
        hosts = [];
        for (var i = 0; i < adapter.config.devices.length; i++) {
            if (adapter.config.devices[i].mac.length > 11) {
                if (adapter.config.devices[i].active) {
                    var mac = adapter.config.devices[i].mac.replace(/:/g,"");
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

    var checkIP = validateIPaddress(adapter.config.asus_ip);
    if (checkIP == false) {
        adapter.log.error('The IP-Address ' + adapter.config.asus_ip + ' is no valid IP-Address');
        stop();
        return;        
    }

    startUpdateDevices(hosts);
    setLastUpdateTime();
    setTimeout(function () {
        startCheckActiveDevices(hosts);
    }, 30000);    

}

function validateIPaddress(inputText) {
    var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if(inputText.value.match(ipformat)) {
        return true;
    } else {
        return false;
    }
}

function main() {
    if (!adapter.config.devices) {
        adapter.log.info('No Devices to watch configured');
        stop();
        return;
    }

    adapter.config.interval = parseInt(adapter.config.interval, 10);
    adapter.config.active_interval = parseInt(adapter.config.active_interval, 10);

    // polling mininum 60 Seconds
    if (adapter.config.interval < 60000) {
        adapter.config.interval = 60000;
    }

    // Active Intervall mininum 60 Seconds
    if (adapter.config.active_interval < 60000) {
        adapter.config.active_interval = 60000;
    }

    syncConfig(function () {
        getActiveDevices();
    });

    //Not necessary
    //adapter.subscribeStates('*');
}
