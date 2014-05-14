function Tool(typeName, bound){
	this.typeName = typeName;
	this.width = 40;
	this.lifeSpan = 1400; //lifespan is approx 1 miniute

	if(typeName == "shell") { 
		this.height = 39;

		this.apply = function(player){ //changes player behavior
				this.age = 0;
				player.step /= 2;
		};		
		this.restore = function(player){ //restore player behavior
			player.step *= 2;
		};		
	}
	
	if(typeName == "heart"){
		this.height = 34;
		 
		this.apply = function(player){ //changes player behavior
			player.life++;
		};		
	}
	
	if(typeName == "ironman"){
		this.height = 60;
		this.apply = function(player){ //changes player behavior
				this.age = 0;
				player.isIronman = true;	
				//change pic Id
		};
		this.restore = function(player){ //restore player behavior
			player.isIronman = false;	
			//change pic Id
			
		};		

	}
	if(typeName == "shoe"){
		this.width = 50;
		this.height = 24;

		this.apply = function(player){ //Apply: changes player behavior
			this.age = 0;
			player.kickLevel *= 1.5;
		};		
		this.restore = function(player){ //restore player behavior
			player.kickLevel /= 1.5;
		};		
	}
	if(typeName == "skate"){
		this.height = 46;
		this.apply = function(player){ //Apply: changes player behavior
				this.age = 0;
				player.step *= 1.5;
		};		
		this.restore = function(player){ //restore player behavior
			player.step /= 1.5;
		};		
		
	}
	if(typeName == "box"){
		this.height = 38;
		
		this.apply = function(player){
			player.bombNum++;
		};		
	}
	this.maxX = bound.maxX - this.width; 
	this.maxY = bound.maxY - this.height;
	this.posX = Math.round(Math.random()*this.maxX); 
	this.posY = Math.round(Math.random()*this.maxY); 
	this.centerX = this.posX + this.width/2;
	this.centerY = this.posY + this.height/2;
}

Tool.prototype.extendLife = function(t){
	this.lifeSpan += t.lifeSpan;
};

Tool.prototype.checkCollision = function(o, margin){
	//if(o.isFlying) return false;
	margin = margin || 0;
	var dist = Math.ceil(Math.sqrt(Math.pow(this.centerX-o.centerX, 2) + Math.pow(this.centerY-o.centerY, 2)));
	var collide = dist < margin+this.width/2+o.width/2;
	return collide? dist: false;
}; 

module.exports = Tool;
