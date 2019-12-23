'use strict'
var Docker = require("dockerode"),
http = require("http");


var docker = new Docker({ socketPath: '/var/run/docker.sock' });
exports.docker = docker;
exports.getIP = function (container, callback) {
    container.inspect(function (err, data) {
        var ip = data.NetworkSettings.IPAddress;
        if (!ip) {
            exports.getIP(container, callback);
        }
        else {
            callback(ip);
        }
    });
};


exports.waitForConn = function (addr, port, callback) {
    http.get({ host: addr, port: port, path: "/" }, function (res) {
        callback();
    }).on('error', function (e) {
        exports.waitForConn(addr, port, callback);
    });
};

exports.removeContainer = function (container, callback) {
    container.kill(function (err, result) {
        if (err) {
            console.log(err);
            callback();
        }
        else {
            container.remove(function (err, result) {
                if (err) {
                    console.log(err);
                }
                callback();
            });
        }
    });
};

exports.reapContainers = function (containers, last_access, settings) {
    var timestamp = (new Date()).getTime();
    for (var token in containers) {
        if (timestamp - last_access[token] > settings.time_out) {
            console.log(token, "has timed out");
            var container = containers[token];
            delete containers[token];

            exports.removeContainer(container, function (containers, last_access, settings) {
                exports.reapContainers(containers, last_access, settings);
            });

            return;
        }
    }
};