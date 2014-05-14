//$(function () {
    var Game = (function(){
        var ctx;
		Game.width = 1000;
		Game.height = 600;

	//**********************************
	//load images starts here
	//**********************************

	function loadImage (){
		var numImages = 0;
			numLoaded = 0,
			o = {};
		function imageLoaded() {
			numLoaded++;
			if (numLoaded === numImages) {
				init();// start the game after images are loaded
			}
		}
		function createImage(name, src){
			if(src instanceof Array) {
				var len = src.length;
				o[name] = [];
				for(var i=0; i<len; i++){
					numImages++;
					o[name].push(newImg(src[i]));
				}
			} else if(src instanceof Object){
				o[name] = {};
				$.each(src, function(key, s){
					numImages++;
					o[name][key] = newImg(s);		
				});
			} else {
				numImages++;
				o[name] = newImg(src);
			}
		}
		function newImg(src){
			var img = new Image();
			img.onload = function() {
				imageLoaded();
			};
			img.src = src;
			return img;
		}

		createImage('bomb', ['./image/ball.png', './image/bomb.png', './image/bang.png']);
		createImage('heart', './image/heart.png');
		createImage('arrow', './image/arrow.png');
		createImage('player', ['./image/type1.png', './image/type2.png', './image/type3.png', './image/type4.png']);
		createImage('playerKick', ['./image/type1k.png', './image/type2k.png', './image/type3k.png', 'image/type4k.png']);
		createImage('tool', {box: 'image/box.png', 
							heart: 'image/heart.png', 
							ironman: 'image/ironman.png', 
							shell: './image/shell.png', 
							shoe: './image/shoe.png', 
							skate: './image/skate.png'});
		return o;
	}
	//**********************************
	//load images ends here
	//**********************************

    function init () {
		var canvas = $('canvas')[0];
		canvas.attr('width', Game.width);
		canvas.attr('height', Game.height);
        ctx = canvas.getContext('2d');

		eventHandling();
    }
	
	function eventHandling(){
	    $('.welcome-screen form').submit(function (e) {
    	    e.preventDefault();
			$('#matching').show();
			$('input').attr('disabled', true);
			$('#submit').attr('disabled', true);
        	Game.playerName = $(this).find('#uname').val();
			Game.picId = parseInt($(this).find('[name=Role]:checked').val());
			Game.newGame();
    	});

		$('.replay-game').click(function(){
			$('#win-matching').show();
			$('#lose-matching').show();
			$('.replay-game').attr('disabled', true);
			Game.newGame();
		});
	}


        var drawFunctions = {
            bomb: function (bomb) {
				ctx.drawImage(Game.imageRepo.bomb[bomb.state], bomb.posX, bomb.posY);
if(bomb.state == 2)console.log('explode!!!');
					//draw the center (posX and poxY) for testing purpose					
				ctx.beginPath();
				ctx.arc(bomb.centerX, bomb.centerY, 3, 0, 2 * Math.PI, false);
				ctx.fillStyle = 'red';
				ctx.fill();
				ctx.closePath();
            }, 
            tool: function(tool){	
				ctx.drawImage(Game.imageRepo.tool[tool.typeName], tool.posX, tool.posY);	
            },
            player: function (player) {
				var x = player.centerX;
					y = player.centerY;

				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(player.angle);
				ctx.translate(-x, -y);

				var picId = player.picId,
				img = player.isKicking?	Game.imageRepo.playerKick[picId] : Game.imageRepo.player[picId];

				ctx.drawImage(img, player.posX, player.posY);
				ctx.restore();

				//draw the center (posX and poxY) for testing purpose					
				ctx.beginPath();
				ctx.arc(x, y, 3, 0, 2 * Math.PI, false);
				ctx.fillStyle = 'blue';
				ctx.fill();
				ctx.closePath();

				if (Game.playerId == player.playerId) {
					ctx.drawImage(Game.imageRepo.arrow, x-10, player.posY-20);
				}

				//display lives of the player
				listTool('heart', player.playerId, player.life);
				
function listTool(type, playerId, num){
				var tools = $(['#', type, '_', player.playerId].join('')),
					num0 = tools.find('img').length,
					delta = num0 - num,
					html = '';
					if(delta > 0){ // remove hearts
						tools.children().slice(num-1).remove();
					} else if (delta < 0) { // add hearts
						do{
						html += "<img src='image/"+type+".png'><br/>";
						} while (++delta);
						tools.append(html);
					}
}
				//display tools of the player
				var arr = ["skate", "shell", "shoe", "ironman", "box"];

				for(var i = 0; i < arr.length; i++){
					var type = arr[i],
						list = player.tools[type],
						len = list? list.length : 0;
	//console.log('player '+player.playerId+' has '+len+' '+type);
					listTool(type, player.playerId, len);
				}
            }
        }

    /********************************************
        socket settings start here
   /********************************************/
    var socket = io.connect('/');
    socket.on('game init', function (playerId, players) {
        Game.playerId = playerId; //get playerId from server
		Game.playerName = players[playerId].name;
		
		$('input').attr('disabled', false);
		$('button').attr('disabled', false);
		$('#matching').hide();
		$('#lose-matching').hide();
		$('#win-matching').hide();
		
        //introduce another player

		//display player name and picture

		for(var i=players.length-1; i>=0; i--){
			var player = players[i];
			$('#role_'+i).attr('src', Game.imageRepo.player[player.picId].src);
			$('#name_'+i).text(player.name);
		}
				
        //key down listener
		$(window).keydown(keySet).keyup(keyUp);
        $('.message').hide();
    });

    socket.on('draw', function (data) {
        Game.draw(data);
    });

    socket.on('you lose', function(){
		$('.lost-screen').show();		
        $(window).off('keydown', keySet).off('keyup', keyUp);
    });

    socket.on('you win', function(){
		$('.win-screen').show();	
        $(window).off('keydown', keySet).off('keyup', keyUp);
    });
    socket.on('tie', function(){
		$('.lost-screen').show();		
        $(window).off('keydown', keySet).off('keyup', keyUp);
	});
    //*********************************
    // socket settings end here
    //*********************************

	Game.newGame = function(){
        socket.emit('new player', Game.playerName, Game.picId);
	};
	
	return {
		load: loadImage
	};

    })();

Game.load();

    Game.draw = function (obj) {
        //clear canvas
		Game.ctx.clearRect(0,0,Game.canvas.width, Game.canvas.height);

        $.each(obj, function (key, array) {
			if(array.length && key!='player'){
            	$.each(array, function (i, o) {
                	Game.drawFunctions[key](o);
            	});
			}
        });

	 $.each(obj, function (key, array) {
			if(array.length && key=='player'){
            	$.each(array, function (i, o) {
                	Game.drawFunctions[key](o);
            	});
			}
        });
    };


    var KEY_CODES = {
        32: 'Spacebar',
        37: 'Left',
        38: 'Up',
        39: 'Right',
        40: 'Down',
		13: 'Enter'
    };
	var KEY_STATUS = {};
	$.each(KEY_CODES, function(key, code){
		KEY_STATUS[code] = false;
	});

    function keySet(e) {
		var key = KEY_CODES[e.which];
		if(key && !KEY_STATUS[key]) { //only fire once if keep depressed
			KEY_STATUS[key] = true;
			socket.emit('key down', key);
		}
		e.preventDefault();
    }

    function keyUp(e) {
		var key = KEY_CODES[e.which];
        if(key){
			KEY_STATUS[key] = false;
   			socket.emit('key up', key);
		}
		e.preventDefault();
    }
//});
