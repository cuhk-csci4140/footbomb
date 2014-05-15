function Bomb(bound, state, pos) {
    var minTime = 400; // 3 seconds
    var maxTime = 1000 - minTime; // max = 30 seconds
    this.lifeSpan = minTime + Math.floor(Math.random() * maxTime);

    this.width = 40;
    this.height = 40;
    this.maxX = bound.maxX - this.height;
    this.maxY = bound.maxY - this.width;
    this.posX = pos ? pos.posX : Math.round(Math.random() * this.maxX);
    this.posY = pos ? pos.posY : Math.round(Math.random() * this.maxY);

    this.state = state || 0; //0:ball, 1:become bomb, 2:explode
    this.age = state ? this.lifeSpan : 0;

    this.nearest = false; //if ture, means this bomb is nearest to a player.

    this.updateCenter();
}

Bomb.prototype.updateCenter = function () {
    this.centerX = this.posX + this.width / 2;
    this.centerY = this.posY + this.height / 2;
};

Bomb.prototype.kick = function (distX, distY, level) {
    if (this.isFlying) return; // it's already kicked
    this.isFlying = true;
    this.nearest = false;

    level = level || 1;

    var dist = 150 * level,
        angle = Math.atan2(distY, distX),
        dx = Math.round(-dist * Math.cos(angle)),
        dy = Math.round(-dist * Math.sin(angle));
    this.setTarget(this.posX + dx, this.posY + dy);
};

Bomb.prototype.setTarget = function (x, y) {
    this.target = {
        posX: between(x, 0, this.maxX),
        posY: between(y, 0, this.maxY)
    };

    var dx = x - this.posX;
    /*
    draw a bezier curve with 3 control points
    p0: this.x, this.y
    p1: this.x+dx/2,  ..
    p2: this.target.x, this.target.y
  */
    this.control = {
        posX: between(this.posX + dx / 2, 0, this.maxX),
        posY: Math.max(0,
            Math.min(this.posY, y) - 20)
    };
    this.t = this.angle = 0;
    this.step = 0.04;
}

Bomb.prototype.setToExplode = function () {
    this.state = 1;
    this.age = this.lifeSpan + 60;
};

Bomb.prototype.explode = function () { //change bomb size, pos, state
    this.width = this.height = 200;
    this.posX = this.centerX - 100;
    this.posY = this.centerY - 100;
    this.nearest = false;
    //this.updateCenter();
    this.state = 2;
};

Bomb.prototype.update = function () {
    var ret = null;

    if (this.state == 2 && this.age >= this.lifeSpan + 65) {
        ret = {
            REMOVE_BOMB: true
        };

    } else if (this.age == this.lifeSpan + 60) {
        if (this.isFlying) {
            this.age--;
        } else {
            this.explode();
            ret = {
                EXPLODE: true
            };
        }
    } else if (this.age == this.lifeSpan) {
        this.state = 1; //ball becomes bomb
        ret = true;
    }
    this.age++;
    return ret;
};

Bomb.prototype.move = function () {
    var t = this.t;

    if (t == null || t == undefined) {
        return;
    }
    if (Math.floor(t) >= 1) {
        return this.stopMove();
    }

    var _t = 1 - t,
        x = this.posX,
        y = this.posY,
        cx = this.control.posX,
        cy = this.control.posY;

    this.t = t + this.step;
    this.posX = _t * (_t * x + t * cx) + t * (_t * cx + t * this.target.posX);
    this.posY = _t * (_t * y + t * cy) + t * (_t * cy + t * this.target.posY);
    this.angle = 2 * Math.PI * this.t;

    this.updateCenter();

    if (x > cx) { //speed up
        this.step = 0.05;
    }
    return true;
};

Bomb.prototype.stopMove = function () {
    this.t = this.target = this.control = this.isFlying = this.angle = null;
    return {
        STOPMOVE: true
    };
};

Bomb.prototype.checkCollision = function (o, margin) {
    if ((o.isFlying && !this.isFlying) ||
        (!o.isFlying && this.isFlying))
        return false;

    margin = margin || 0;
    var dist = Math.ceil(Math.sqrt(Math.pow(this.centerX - o.centerX, 2) + Math.pow(this.centerY - o.centerY, 2)));
    var collide = dist < margin + this.width / 2 + o.width / 2;
    return collide ? dist : false;
};

function between(value, min, max) {
    return Math.max(Math.min(value, max), min);
}
module.exports = Bomb;
