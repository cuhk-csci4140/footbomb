$(function () {
    var Game = {};

    Game.preload = function () {
        //load images
        Game.imageRepo = loadImage();

        function loadImage() {
            var numImages = 0;
            numLoaded = 0,
            o = {};

            function imageLoaded() {
                numLoaded++;
                if (numLoaded === numImages) {
                    Game.init(); // start the game after images are loaded
                }
            }

            function createImage(name, src) {
                if (src instanceof Array) {
                    var len = src.length;
                    o[name] = [];
                    for (var i = 0; i < len; i++) {
                        numImages++;
                        o[name].push(newImg(src[i]));
                    }
                } else if (src instanceof Object) {
                    o[name] = {};
                    $.each(src, function (key, s) {
                        numImages++;
                        o[name][key] = newImg(s);
                    });
                } else {
                    numImages++;
                    o[name] = newImg(src);
                }
            }

            function newImg(src) {
                var img = new Image();
                img.onload = function () {
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
            createImage('tool', {
                box: 'image/box.png',
                heart: 'image/heart.png',
                ironman: 'image/ironman.png',
                shell: './image/shell.png',
                shoe: './image/shoe.png',
                skate: './image/skate.png'
            });
            return o;
        }

    };

    Game.init = function () {
        var canvas = $('canvas');
        canvas.attr('width', 1000);
        canvas.attr('height', 600);

        /********************************************
        	socket settings start here
   		/********************************************/
        Game.socket = io.connect('/');

        Game.newGame = function () {
            Game.socket.emit('new player', Game.playerName, Game.picId);
            $(window).on('beforeunload', preventLeave);
        };

        Game.socket.on('game init', function (playerId, players) {
            Game.playerId = playerId; //get playerId from server
            Game.playerName = players[playerId].name;

            $('.welcome-screen input').attr('disabled', false);
            $('.welcome-screen button').attr('disabled', false);
            $('.welcome-screen .matching').addClass('hide');

			// clear images on side panels
			$('.player .tool-list div').html('');

            //display player name and picture
            for (var i = players.length - 1; i >= 0; i--) {
                var player = players[i];
                $('#role_' + i).attr('src', Game.imageRepo.player[player.picId].src);
                $('#name_' + i).text(player.name);
            }
            //key down listener
            $(window).keydown(keySet).keyup(keyUp);
            $('.message').hide();
        });

        Game.socket.on('draw', function (data) {
            Game.draw(data);
        });

        Game.socket.on('sound', function (data) {
            var audio_name = "audio_" + data;
			var background = document.getElementById("audio_background");
			//background.addEventListener('ended', function () {
				//this.load();
				//this.play();
				//console.log("ended");
			//}, false);
			//$('.audio_background').bind('ended', function()  {
				//this.load();
				//this.play();
				//console.log("end");
			//});
			
			if(data == "win" || data == "lose") {
				background.pause(); 
				background.load();
			}
            var audio = document.getElementById(audio_name);
			audio.load();
            audio.play();
			console.log("play " + audio_name);
        });

        Game.socket.on('game over', function (data) {
            $(window).off('keydown', keySet).off('keyup', keyUp).off('beforeunload', preventLeave);
            var replay = $('.replay-screen');
            replay.find('.result').text(data);
            replay.find('.replay-button').attr('disabled', false);
            replay.find('.matching').hide();
            replay.find('.role img').attr('src', $('#role_' + Game.playerId).attr('src')).attr('class', data === 'you win' ? 'swing' : 'lose');
            replay.show();
        });

        //*********************************
        // socket settings end here
        //*********************************

        //*********************************
        // key up and down start here
        //*********************************
        var KEY_CODES = {
            32: 'Spacebar',
            37: 'Left',
            38: 'Up',
            39: 'Right',
            40: 'Down',
            13: 'Enter'
        };
        var KEY_STATUS = {};

        $.each(KEY_CODES, function (key, code) {
            KEY_STATUS[code] = false;
        });

        function keySet(e) {
            var key = KEY_CODES[e.which];
            if (key && !KEY_STATUS[key]) { //only fire once if keep depressed
                console.log("Key down:" + key);
                KEY_STATUS[key] = true;
                Game.socket.emit('key down', key);
            }
            e.preventDefault();
        }

        function keyUp(e) {
            var key = KEY_CODES[e.which];
            console.log("Key up:" + key);
            if (key) {
                KEY_STATUS[key] = false;
                Game.socket.emit('key up', key);
            }
            e.preventDefault();
        }

        function preventLeave(e) {
            return "You will lose if you leave this page!";
        }

        //*********************************
        // key up and down end here
        //*********************************

        $('.welcome-screen form').submit(function (e) {
            e.preventDefault();
            $(this).find('.matching').show();
            $(this).find('input').attr('disabled', true);
            $(this).find('#submit').attr('disabled', true);

            Game.playerName = $(this).find('#uname').val();
            Game.picId = parseInt($(this).find('[name=Role]:checked').val());
            Game.newGame();
        });

        $('.replay-button').click(function () {
            $('.replay-screen .matching').show();
            $(this).attr('disabled', true);
            Game.newGame();
        });
    };

    Game.draw = function (obj) {
        var canvas = $('#canvas')[0],
            ctx = canvas.getContext('2d');

        //clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var drawFunctions = {
            bomb: function (bomb) {
                ctx.globalCompositeOperation = 'destination-over';
//rotate
            if (bomb.isFlying) {
                var x = bomb.centerX,
                    y = bomb.centerY;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(bomb.angle);
                ctx.translate(-x, -y);

                ctx.drawImage(Game.imageRepo.bomb[bomb.state], bomb.posX, bomb.posY);
                ctx.restore();
            } else {
                ctx.drawImage(Game.imageRepo.bomb[bomb.state], bomb.posX, bomb.posY);
            }
                //highlight the bomb that is nearest to the player
                if (bomb.nearest == true) {
                    ctx.beginPath();
                    ctx.arc(bomb.centerX, bomb.centerY, 20, 0, 2 * Math.PI, false);
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = 'rgba(230, 0, 0, .6)';
                    ctx.stroke();
                    ctx.closePath();
                }
            },
            tool: function (tool) {
                ctx.globalCompositeOperation = 'destination-over';
                ctx.drawImage(Game.imageRepo.tool[tool.typeName], tool.posX, tool.posY);
            },
            player: function (player) {
                var x = player.centerX;
                y = player.centerY;

                ctx.globalCompositeOperation = 'source-over';
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(player.angle);
                ctx.translate(-x, -y);

                var picId = player.picId,
                    img = player.isKicking ? Game.imageRepo.playerKick[picId] : Game.imageRepo.player[picId];

                ctx.drawImage(img, player.posX, player.posY);
                ctx.restore();

                if (Game.playerId == player.playerId) {
                    ctx.drawImage(Game.imageRepo.arrow, x - 10, player.posY - 20);
                }

                //display lives of the player
                listTool('heart', player.playerId, player.life);
                listTool('box', player.playerId, player.bombNum);

                function listTool(type, playerId, num) {
                    var tools = $(['#', type, '_', player.playerId].join('')),
                        num0 = tools.find('img').length,
                        delta = num0 - num,
                        html = '';
                    if (delta > 0) { // remove hearts
                        tools.children().slice(num - 1).remove();
                    } else if (delta < 0) { // add hearts
                        do {
                            html += "<br/><img src='image/" + type + ".png'>";
                        } while (++delta);
                        tools.append(html);
                    }
                }
                //display tools of the player
                var arr = ["skate", "shell", "shoe", "ironman"];

                for (var i = 0; i < arr.length; i++) {
                    var type = arr[i],
                        len = player.tools[type]? 1 : 0;
                    listTool(type, player.playerId, len);
                }
            }
        };


        $.each(obj, function (key, array) {
            if (array.length /*&& key != 'player'*/ ) {
                $.each(array, function (i, o) {
                    drawFunctions[key](o);
                });
            }
        });
    };

    Game.preload();
});
