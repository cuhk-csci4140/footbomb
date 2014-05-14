#!/bin/env node

var SERVER_URL = "127.0.0.1",
    PORT = 8080;

var app = require("http").createServer(handler),
    path = require("path"),
    fs = require("fs"),
    io = require('socket.io').listen(app);

app.listen(PORT, SERVER_URL);

var Room = require('./Room.js'),
    emptyRoom = [], //array of empty room number
    rooms = [];
/*rooms = [{ player: [player1, player2], 
				 bomb : [...],
				 tool : [ ]
				} ... ] */

Room.prototype.Player = require('./Player.js');
Room.prototype.Bomb = require('./Bomb.js');
Room.prototype.Tool = require('./Tool.js');

//************************************************
//Game control starts here
//************************************************
var GameControl = (function () {
    function assignRoom(name, picId, socket) {
        var len = emptyRoom.length,
            roomId;

        if (len) {
            roomId = emptyRoom[len - 1];
        } else {
            roomId = rooms.length;
            rooms.push(new Room(roomId));
            emptyRoom.push(roomId);
        }

        var room = rooms[roomId],
            playerId = room.player.length; //0 or 1

        socket.join("" + roomId);
        socket.roomId = roomId;
        socket.playerId = playerId;
        room.createPlayer(name, socket.playerId, picId);

        if (io.sockets.clients('' + roomId).length >= 2) { //the room is full, make a new room and start the game
            emptyRoom.pop();
            socket.emit('game init', 1, room.player);
            socket.broadcast.to('' + roomId).emit('game init', 0, room.player);
            gameStart(roomId);
        }
    }

    function gameStart(roomId) {
        var room = rooms[roomId];
        room.gameIsOver = false;

        io.sockets.in('' + roomId).emit('sound', 'background');

        genBombs();
        genTools();
        update();


        function genBombs() {
            if (room.newBombInterval > 5000) {
                room.newBombInterval = room.newBombInterval * 0.9;
            }

            room.createBombs();
            io.sockets.in('' + roomId).emit('draw', room.getData());
            if (!room.gameIsOver) {

                room.bombLoopId = setTimeout(genBombs, genInterval(room.newBombInterval));
            }
        };

        function genTools() {
            room.createTools();
            io.sockets.in('' + roomId).emit('draw', room.getData());
            if (!room.gameIsOver) {

                room.toolLoopId = setTimeout(genTools, genInterval(room.newToolInterval));
            }
        }

        function update() {
            if (room.needUpdate()) {
                io.sockets.in('' + roomId).emit('draw', room.getData());
            }

            //if any player is dead
            if (!room.gameIsOver) {
                room.updateLoopId = setTimeout(update, 50);
            } else {
                var losers = room.losers;
                //if(gameIsOver) return;
                if (losers.length == room.player.length) { //tie game
                    io.sockets.in('' + roomId).emit('draw', room.getData());
                    io.sockets.in('' + roomId).emit('game over', 'tie');
                    io.sockets.in('' + roomId).emit('sound', 'lose');
                    return;
                }

                //get all sockets in a room
                var sockets = io.sockets.clients('' + roomId);
                io.sockets.in('' + roomId).emit('draw', room.getData());
                for (var i = sockets.length - 1; i >= 0; i--) {
                    var socket = sockets[i];
                    if (socket.playerId == losers[0].playerId) {
                        socket.emit('game over', 'You lose');
                        socket.emit('sound', 'lose');
                    } else {
                        socket.emit('game over', 'You win');
                        socket.emit('sound', 'win');
                    }
                    socket.leave('' + roomId);
                }
                gameOver(roomId);
            }
        }


        function genInterval(interval) {
            return (Math.random() * .4 + .8) * interval;
        }
    }

    function gameOver(roomId) {

        var room = rooms[roomId];
        //clear bomb and tool generation loop
        clearTimeout(room.bombLoopId);
        clearTimeout(room.toolLoopId);
        clearTimeout(room.updateLoopId);

        rooms[roomId] = new Room(roomId);
        //remove the room
        emptyRoom.unshift(roomId);
        rooms[roomId].gameIsOver = true;
    }

    return {
        assignRoom: assignRoom,
        gameOver: gameOver
    };
})();

//************************************************
//Game control ends here
//************************************************

//********************************
//	socket settings start here
//********************************
io.set('log level', 1);

io.sockets.on('connection', function (socket) {
    socket.on('new player', function (userName, userPic) {
        if (rooms.roomId) {
            socket.leave('' + socket.roomId);
        }
        GameControl.assignRoom(userName, userPic, socket);
    });
    socket.on('key down', function (key) {
        var roomId = socket.roomId,
            room = rooms[roomId];

        if (io.sockets.clients('' + roomId).indexOf(socket) == -1) {
            return;
        }
        var playerId = socket.playerId;

        room.updatePlayerActionDown(key, playerId);
        io.sockets.in('' + roomId).emit('draw', room.getData());
    });
    socket.on('key up', function (key) {
        var roomId = socket.roomId,
            room = rooms[roomId],
            playerId = socket.playerId;

        if (io.sockets.clients('' + roomId).indexOf(socket) == -1) {
            return;
        }
        room.updatePlayerActionUp(key, playerId);
        io.sockets.in('' + roomId).emit('draw', room.getData());
    });
    socket.on('disconnect', function () {
        var roomId = socket.roomId,
            room = rooms[roomId];
        if (io.sockets.clients('' + roomId).indexOf(socket) == -1) {
            return;
        }

        if (room.player.length <= 1) { // if the room is empty, reset it
            GameControl.gameOver(roomId);
            return;
        }
        if (room.gameIsOver === false) {
            socket.broadcast.to('' + roomId).emit('game over', 'Your rival runs away.')
            socket.broadcast.to('' + roomId).emit('sound', 'win');

            // leave room
            var sockets = io.sockets.clients('' + roomId);
            for (var i = sockets.length - 1; i >= 0; i--) {
                sockets[i].leave('' + roomId);
            }
        }
    });
});
//********************************
//	socket settings end here
//********************************

//********************************
// serve static files
//********************************
function handler(req, res) {

    var filename = require('url').parse(req.url).pathname;
    if (filename == '/') {
        filename = "/footbomb.html";
    };
    var ext = path.extname(filename);
    var localPath = __dirname;
    var validExtensions = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".txt": "text/plain",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
        ".png": "image/png",
        ".wav": "audio/wav"
    };
    var isValidExt = validExtensions[ext];

    if (isValidExt) {
        localPath += filename;
        fs.exists(localPath, function (exists) {
            if (exists) {
                getFile(localPath, res, ext);
            } else {
                console.log("File not found: " + localPath);
                res.writeHead(404);
                res.end();
            }
        });
    } else {
        console.log("Invalid file extension detected: " + filename)
    }
}


function getFile(localPath, res, mimeType) {
    fs.readFile(localPath, function (err, contents) {
        if (!err) {
            res.setHeader("Content-Length", contents.length);
            res.setHeader("Content-Type", mimeType);
            res.statusCode = 200;
            res.end(contents);
        } else {
            res.writeHead(500);
            res.end();
        }
    });
}
