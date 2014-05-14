function Player(name, playerId, picId,bound) {
    this.name = name;
    this.playerId = playerId;

    this.width = 45;
    this.height = 45;
    this.maxX = bound.maxX - 60;
    this.maxY = bound.maxY - 60;
    
    this.posY = this.maxY/2;
    this.posX = (playerId % 2)? 800 : 200;

	this.angle = getDegree(90);
	if(playerId % 2){
		this.angle = -this.angle;
	}

    this.picId = picId;
    this.step = 5;
    this.alive = true;
    this.life = 3;
	this.bombNum = 0;

	//related to key press
    this.kickLevel = 1;
    this.isKicking = false;
    this.isTurningLeft = false;
    this.isTurningRight = false;
    this.isGoingForward = false;
    this.isGoingBack = false;

    this.tools = {};
	this.updateCenter();
}

Player.prototype.updateCenter = function(){
	this.centerX = this.posX + 30;
	this.centerY = this.posY + 36;
};

Player.prototype.restore = function(x, y){
	this.posX = x;
	this.posY = y;
	this.updateCenter();
};

Player.prototype.move = function () {
	var twoPi = getDegree(360), 
		needupdate = false;

    if (this.isTurningLeft && !this.isTurningRight) { //turn left, decrease angle
		this.angle -= getDegree(this.step);
		if(this.angle < 0){
			this.angle += twoPi;
		}
		needupdate = true;
    } else if (!this.isTurningLeft && this.isTurningRight) {
		this.angle += getDegree(this.step);
		if(this.angle > twoPi){
			this.angle -= twoPi;
		}
		needupdate = true;
    } 

	
	if(!this.isGoingBack && this.isGoingForward){ //go forward
		needupdate = this.moveForward() || needupdate;
	} else if(!this.isGoingForward && this.isGoingBack){ // go backward
		needupdate = this.moveBackward() || needupdate;
   	}
	return needupdate;
};

Player.prototype.moveForward = function(){
	var dy = Math.round(-Math.cos(this.angle)*this.step),
			dx = Math.round(Math.sin(this.angle)*this.step),
        	x = this.posX + dx,
        	y = this.posY + dy;

	if(x<0 || x>this.maxX || y<0 || y>this.maxY){
		return false;
	}
	this.posX = x;
	this.posY = y;
	this.updateCenter();
	return true;
};

Player.prototype.moveBackward = function(){
	var dy = Math.round(-Math.cos(this.angle)*this.step),
		dx = Math.round(Math.sin(this.angle)*this.step);

	var x = this.posX -dx, 
		y = this.posY - dy;
	if(x<0 || x>this.maxX || y<0 || y>this.maxY){
		return false;
	}
	this.posX = x;
	this.posY = y;
	this.updateCenter();
	return true;
};

Player.prototype.kick = function () {
    this.isKicking = true;
	//change profile pic
};

Player.prototype.decreaseLife = function (){
	if(!this.isIronman) {
		this.life--;
		if(this.life === 0){
			this.alive = false;
		}
	}
}

Player.prototype.addTool = function(t){
	var type = t.typeName;
console.log('pick '+type);
	if (type == 'skate' && this.tools.shell){
		this.removeTool(this.tools.shell);		
	} else if (type == 'shell' && this.tools.skate){
		this.removeTool(this.tools.skate);
	}

	if(type=='heart' || type=='box'){
		t.apply(this);
	} else if (this.tools[type]){
		this.tools[type].extendLife(t);
console.log('extend '+type+', now its lifespan:'+this.tools[type].lifeSpan);
	} else {
		this.tools[type] = t;
		t.apply(this);
	}
}

Player.prototype.removeTool = function(t){
	var type = t.typeName;
console.log('remove '+type);
	if(!this.tools[type] || type=='heart' || type=='box') return;
	t.restore(this);
	this.tools[type] = null;
};

Player.prototype.removeBomb= function(){
	if(this.bombNum>=1){//.getBombNum()){
		this.bombNum--;//this.tools.box.pop();
	}
};
/*

Player.prototype.getBombNum = function(){
	return this.tools.box? this.tools.box.length : 0;
};*/

Player.prototype.checkCollision = function(o, margin){
	if(o.isFlying) return false; // if a bomb is kicked by the player

	margin = margin || 0;
	var dist = Math.ceil(Math.sqrt(Math.pow(this.centerX-o.centerX, 2) + Math.pow(this.centerY-o.centerY, 2)));
	var collide = dist < margin+this.width/2+o.width/2;
	return collide? dist: false;
}; 

function between(value, min, max){
	return Math.min(max, Math.max(min, value));
}

function getDegree(deg){
	return deg * Math.PI/180;
}
module.exports = Player;
