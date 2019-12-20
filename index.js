
var
    express = require("express"),
    cookieParser = require("cookie-parser"),
    expressSession = require("express-session"),
    bodyParser = require("body-parser"),
    crypto = require("crypto"),
    http = require("http"),
    fs = require('fs');


var 
    settings = require("./settings.json"),
    initPort = 40000,
    db = require("./storage"),
    docker = require("./docker");
    

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.json());
const sessionParser = expressSession({ secret: crypto.randomBytes(10).toString("hex"), resave: true, saveUninitialized: true });
app.use(sessionParser);


app.get("/user/:user",
    function (req, res) {
        var user = req.params.user;
        var port = initPort++;
        if (settings.whitelist.indexOf(user) > -1) {
            res.redirect("/deny");
            return;
        }
        docker.reapContainers();

        if (user in users && users[user] in containers) {
            last_access[users[user]] = (new Date()).getTime();
            res.redirect("http://" + ipaddr[user]);
        } else {

            users[user] = user;
            var image_name = "codercom/code-server:v2";

            try {
                fs.mkdirSync(__dirname + "/users/" + user, { recursive: true })
            } catch (err) {
                if (err.code !== 'EEXIST') throw err
            }

            docker.docker.run(image_name, ["--auth", "none"], undefined, {
                "Hostconfig": {
                    "Memory": settings.images[image_name].max_memory,
                    "DiskQuota": settings.images[image_name].disk_quota,
                    "Binds": [__dirname + "/users/" + user + "/project:/home/coder/project",
                    __dirname + "/users/" + user + "/.local/share/code-server:/home/coder/.local/share/code-server"],
                    "PortBindings": { "8080/tcp": [{ "HostPort": ""+port }] }
                }
            }, function (err, data, container) {
                console.log(err);
            }).on('container', function (container) {
                containers[user] = container;
                var ip = "127.0.0.1";
                docker.waitForConn(ip, port, function () {
                    ipaddr[user] = ip + ":" + port;
                    res.redirect("http://" + ipaddr[user]);
                });
            });
        }
    });

app.get("/deny", function (req, res) {
    res.render("deny");
});


function exitHandler() {
    for (var token in containers) {
        var container = containers[token];
        delete containers[token];
        docker.removeContainer(container, function () {
            exitHandler();
        });

        return;
    }
    process.exit();
}


process.on('exit', exitHandler.bind());
process.on('SIGINT', exitHandler.bind());

var server = http.createServer(app);

server.on("upgrade", function (req, socket, head) {
    sessionParser(req, {}, () => {
        if (req.session.passport) {
            var userid = req.session.passport.user;
            last_access[users[userid]] = (new Date()).getTime();
            proxy.ws(req, socket, head, { target: "ws://" + ipaddr[users[userid]] });
            socket.on("data", function () {
                last_access[users[userid]] = (new Date()).getTime();
            });
        }
    });
});

server.on("error", err => console.log(err));

server.listen(settings.port);
setInterval(docker.reapContainers, settings.time_out);
