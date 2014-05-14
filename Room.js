function Room(roomId) {
    this.roomId = roomId || 0;
    this.player = [];
    this.tool = [];
    this.bomb = [];
    this.newBombMax = 10;
    this.newBombMin = 5;
    this.newBombInterval = 23000;
    //generate tools
    this.newToolMin = 4;
    this.newToolMax = 7;
    this.newToolInterval = 40000;
    this.gameBound = {
        maxX: 1000,
        maxY: 600
    };
    this.losers = [];
    this.highlight = [null, null]; //denote the nearest bomb to each player
}

Room.prototype.getData = function () {
    return {
        player: this.player,
        tool: this.tool,
        bomb: this.bomb
    };
};

Room.prototype.needUpdate = function () {
    var b = this.updateBombs(),
        t = this.updateTools(),
        p = this.updatePlayers();
    return b || t || p;
};

Room.prototype.updatePlayers = function () {
    var players = this.player,
        bombs = this.bomb,
        needUpdate = false;

    for (var i = players.length - 1; i >= 0; i--) {
        var player = players[i],
            x = player.posX,
            y = player.posY,
            id = player.playerId;

        if (player.move()) {
            needUpdate = true;

            //denote the bombs that can be kicked
            var near_bombs = checkCollisions(player, bombs, 10);
            if (near_bombs.length) {
                if (this.highlight[id] != near_bombs[0]) {
                    if (this.highlight[id] && (this.highlight[0] != this.highlight[1]))
                        this.highlight[id].nearest = false;
                    near_bombs[0].nearest = true;
                    this.highlight[id] = near_bombs[0];
                } else {
                    if (this.highlight[id]) this.highlight[id].nearest = true;
                }
            } else {
                if (this.highlight[id]) {
                    if (this.highlight[0] != this.highlight[1]) {
                        this.highlight[id].nearest = false;
                    }
                    this.highlight[id] = null;
                }
            }

            //if collide with other player
            var other = players[1 - i];
            if (player.checkCollision(other)) {
                player.restore(x, y);
            } else if (near_bombs.length && checkCollisions(player, near_bombs).length) {
                player.restore(x, y);
            }

            // --- check if come accross a tool --- //
            var toolCollisions = checkCollisions(player, this.tool, 0);

            if (toolCollisions.length) {
                var tool = toolCollisions[0];
                player.addTool(tool);
                this.removeTool(tool);
                needUpdate = true;
            }
        }
    }
    return needUpdate;
};

Room.prototype.updatePlayerActionUp = function (key, playerId) {
    var player = this.player[playerId],
        bombs = this.bomb,
        tools = this.tool;

    bombs.nearest = false;

    if (key == 'Spacebar') {
        player.isKicking = false;
    } else if (key == 'Left') {
        player.isTurningLeft = false;
    } else if (key == 'Right') {
        player.isTurningRight = false;
    } else if (key == 'Up') {
        player.isGoingForward = false;
    } else if (key == 'Down') {
        player.isGoingBack = false;
    } else { //put bomb
        if (player.bombNum <= 0) return;

        var b = new this.Bomb(this.gameBound, 1);
        b.posX = player.centerX - b.width / 2 + Math.sin(player.angle) * (b.width + 15);
        b.posY = player.centerY - b.height / 2 - Math.cos(player.angle) * (b.height + 15);
        b.updateCenter();

        var c = checkCollisions(b, this.bomb.concat(this.player, this.tool));
        if (!c.length) {
            this.bomb.push(b);
            player.removeBomb();
        }
    }
}

Room.prototype.updatePlayerActionDown = function (key, playerId) {
    var player = this.player[playerId],
        bombs = this.bomb,
        tools = this.tool;
    var needupdate = false;


    if (key == 'Spacebar') { //kick
        player.kick(); //move player's feet

        var bomb = this.highlight[player.playerId];
        if (bomb) {
            var dx = player.centerX - bomb.centerX;
            dy = player.centerY - bomb.centerY;
            bomb.kick(dx, dy, player.kickLevel);
        }
        this.highlight[player.playerId] = null;

    } else {
        //move player first
        if (key == 'Left') {
            player.isTurningLeft = true;
        } else if (key == 'Right') {
            player.isTurningRight = true;
        } else if (key == 'Up') {
            player.isGoingForward = true;
        } else if (key == 'Down') {
            player.isGoingBack = true;
        }
    }
    return needupdate;
}

Room.prototype.createPlayer = function (name, playerId, picId) {
    this.player.push(new this.Player(name, playerId, picId, this.gameBound));
};

Room.prototype.createBombs = function () {
    var num = randInt(this.newBombMin, this.newBombMax);
    for (var i = 0; i < num; i++) {
        var b = new this.Bomb(this.gameBound);
        if (!checkCollisions(b, this.bomb.concat(this.player, this.tool)).length) {
            this.bomb.push(b);
        }
    }
};

Room.prototype.createTools = function () {
    var num = randInt(this.newToolMin, this.newToolMax),
        types = ['heart', 'ironman', 'shoe', 'skate', 'shell', 'box'];
    len = types.length;

    for (var i = 0; i < num; i++) {
        var typeName = types[randInt(randInt(0, len), len)],
            t = new this.Tool(typeName, this.gameBound);
        if (!checkCollisions(t, this.bomb.concat(this.player, this.tool)).length) {
            this.tool.push(t);
        }
    }
};

Room.prototype.updateTools = function () {
    var players = this.player,
        needUpdate = false;

    for (var p = players.length - 1; p >= 0; p--) {
        var player = players[p],
            tools = player.tools;

        for (var key in tools) {
            var tool = tools[key];

            if (tool && tool.age != null) {
                if (tool.age > tool.lifeSpan) { //the tool expires
                    needUpdate = true;
                    player.removeTool(tool);
                }
                tool.age++;
            }
        }
    }
    return needUpdate;
};

Room.prototype.updateBombs = function () {
    var bombs = this.bomb,
        players = this.player,
        tools = this.tool,
        needUpdate = false;

    for (var i = bombs.length - 1; i >= 0; i--) {
        var bomb = bombs[i],
            ret = bomb.move();

        if (ret) {
            needUpdate = true;
            if (ret.STOPMOVE) {

                var others = bombs.slice();
                others.splice(others.indexOf(bomb), 1);

                var reachBomb = checkCollisions(bomb, others, 1);
                if (reachBomb.length) {
                    bomb.setToExplode();
                    for (var j = reachBomb.length - 1; j >= 0; j--) {
                        reachBomb[j].setToExplode();
                    }
                }
            }
        }

        var state = bomb.update();
        if (state) {
            needUpdate = true;

            if (state.REMOVE_BOMB) {
                this.removeBomb(bomb);
            } else if (state.EXPLODE) {
                //check if any player is nearby
                var victims = checkCollisions(bomb, players); //players who have been hurt by the bomb
                for (var i = victims.length - 1; i >= 0; i--) {
                    victims[i].decreaseLife();
                    if (!victims[i].alive) {
                        this.losers.push(victims[i]);
                        this.gameIsOver = true;
                    }
                }
                var nearbyBalls = checkCollisions(bomb, bombs); //balls nearby will become bombs immediately
                for (i = nearbyBalls.length - 1; i >= 0; i--) {
                    if (nearbyBalls[i].state == 0) {
                        nearbyBalls[i].age = nearbyBalls[i].lifeSpan;
                        nearbyBalls[i].state = 1;
                    }
                }
                var nearbyTools = checkCollisions(bomb, tools); //tools nearby will be removed immediately
                for (i = nearbyTools.length - 1; i >= 0; i--) {
                    this.removeTool(nearbyTools[i]);
                }
            }
        }
    }
    return needUpdate;
}

Room.prototype.removeBomb = function (bomb) {
    this.bomb.splice(this.bomb.indexOf(bomb), 1);
};


Room.prototype.removeTool = function (tool) {
    this.tool.splice(this.tool.indexOf(tool), 1);
};

function checkCollisions(o, list, margin) {
    var collisions = [];
    var coll_dist = [];
    var distance = 0;

    for (var i = list.length - 1; i >= 0; i--) {
        // must use !== because distance can be 0, which == "false"
        if (false !== (distance = o.checkCollision(list[i], margin))) {
            coll_dist.push({
                dist: distance,
                collObj: list[i]
            });
        }
    }

    if (coll_dist.length == 0) {
        return collisions;
    }

    // --- sort according to the returned distance
    coll_dist.sort(function (a, b) {
        return a.dist - b.dist;
    });

    for (i = 0; i < coll_dist.length; i++) {
        collisions.push(coll_dist[i].collObj);
    }

    return collisions;
}

function genInterval(interval) {
    return (Math.random() * .4 + .8) * interval;
}

function randInt(min, max) { //[min, max)
    return Math.floor(Math.random() * (max - min) + min);
}

function min(array) {
    return array.sort(function (a, b) {
        return a > b;
    })[0];
}

function max(array) {
    return array.sort(function (a, b) {
        return a < b;
    })[0];
}
module.exports = Room;
