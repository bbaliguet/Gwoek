/*
 *
 *
 *
 * HELPERS
 *
 *
 *
 */

var $ = document.querySelector.bind(document);

function setVisible(el, visible) {
	el.style.display = visible ? "block" : "none";
}

function jitter(origin, value, randFn) {
	var rand = Math.random();
	if (randFn) {
		rand = randFn(rand);
	}
	return origin + value * rand - value / 2;
}

// same as jitter, but push for extrem values
function jitterOnBorders(origin, value) {
	var rand = Math.random();
	rand = rand - 0.5;
	rand = rand * rand * 4;
	return jitter(origin, value, rand);
}

function log(msg, obj) {
	if (!window.console) {
		return;
	}
	console.log(msg, obj);
}

function getJSON(url, callback) {
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.onreadystatechange = function() {
		if (request.readyState != 4 || request.status != 200) {
			return;
		}
		callback(JSON.parse(request.responseText));
	};
	request.send();
}

// redirect to https
if (window.location.protocol == "http:" && window.location.hostname != "localhost") {
	window.location.protocol = "https:";
}

/*
 *
 *
 *
 * DOM ELEMENTS
 *
 *
 *
 */

var _scoreEl = $("#score");
var _topScoreEl = $("#topscore");
var _twitterEl = $("#twitter");
var _gameOverEl = $("#gameover");
var _splashEl = $("#splash");
var _lvlUpEl = $("#lvlUp");
var _loadingEl = $("#loading");
var _highscores = $("#highscores");
var _highscoresShow = $("#highscoresShow");

// canvas
var _canvasEl = $("#canvas");

/*
 *
 *
 *
 * VARIABLES
 *
 *
 *
 */

// game variables
var gameOver = true;
var withSplash = true;
var topScore = 0;
var darkColor = false;
var stage;

// view related
var viewport;

// environment and adjusted variables
var tileWidth = 15;
var lvlupGap = 10000;
var acceleration = 15;
var baseSpeed = 60;
var colorTimeout = 500;
var backgroundSpeed = 4;

// limits for random ground generation
var topLimit = 300;
var bottomLimit = 20;
var bgTopLimit = 500;
var bgBottomLimit = 100;
var bgJitter = (bgTopLimit - bgBottomLimit) / 2;
var bgMiddle = bgBottomLimit + bgJitter;

// random generator
var seed = 0;

var twitterMsg = "Just scored {score} on @GwoekGame! Challenge me now: http://bbaliguet.github.io/Gwoek/#{seed} #Gwoek_{seed}_{score}";
var twitterLink = "https://twitter.com/{user}/status/{id}";
var highscoresUrl = "//cryptic-temple-1790.herokuapp.com/?";

// highscores
var highscores = {};

/*
 *
 *
 *
 * PARSE
 *
 *
 *
 */

if (window.Parse) {
	// parse saving
	var Score = Parse.Object.extend("Score");
	var publicACL = new Parse.ACL();
	publicACL.setPublicReadAccess(true);
	publicACL.setPublicWriteAccess(false);
}

/*
 *
 *
 *
 * CLASSES
 *
 *
 *
 */

// Clock generator
var Clock = function() {
	this.now = Date.now();
	this.start = this.now;
};
Clock.prototype.tick = function(chunk) {
	var now = Date.now();
	var dif = now - this.now;
	dif = dif - dif % chunk;
	this.now = this.now + dif;
	return dif;
};
Clock.prototype.total = function() {
	return this.now - this.start;
};

/*
 *
 *
 *
 * RENDERERS
 *
 *
 *
 */

function applyCellShadingStyle(context) {
	context.strokeStyle = "rgba(255,255,255,1)";
	context.lineWidth = 8;
	context.shadowColor = "rgba(0,0,0,0.5)";
	context.shadowBlur = 15;
	context.shadowOffsetX = 0;
	context.shadowOffsetY = 10;
}

function applyStandardStyle(context) {
	context.lineWidth = 0;
	context.shadowColor = "rgba(0,0,0,0.5)";
	context.shadowBlur = 5;
	context.shadowOffsetX = 0;
	context.shadowOffsetY = 2;
}

function applyNoStyle(context) {
	context.lineWidth = 0;
	context.shadowBlur = 0;
	context.shadowOffsetX = 0;
	context.shadowOffsetY = 0;
}

function renderPrepare() {
	var context = _canvasEl.getContext("2d");
	context.clearRect(0, 0, viewport.width, viewport.height);
}

function renderGround(stage, background) {

	var ground = stage.ground;
	var context = _canvasEl.getContext("2d");
	var nbTiles = ground.length;

	var playerRendered = false;
	var player = null;
	var playerXPos = 0;
	var playerOnFloor = false;

	if (background) {
		player = stage.players[0];
		playerXPos = player.left;
		playerOnFloor = player.onFloor;
	}

	if (background) {
		applyCellShadingStyle(context);
	} else {
		context.fillStyle = "hsl(" + stage.color[0] + ",100%,70%)";
		applyNoStyle(context);
	}

	context.beginPath();
	context.moveTo(0, viewport.height);

	var lastGroundY = null;
	ground.forEach(function(item, index) {
		var xPos = item.left;
		var yPos = item.height;

		if (index > nbTiles * 4 / 5) {
			// progressive height, square fn
			var variation = (nbTiles - index) / nbTiles * 5;
			yPos = ((1 - (1 - variation) * (1 - variation)) / 2 + 1 / 2) * yPos;
		}

		yPos = viewport.height - yPos;
		if (yPos != lastGroundY || item.lvlUp) {
			context.lineTo(xPos, yPos);
			lastGround = yPos;
		}

		// lvl limit
		if (item.lvlUp) {
			context.lineTo(xPos - 10, yPos - 25);
			context.lineTo(xPos, yPos - 100);
			context.lineTo(xPos + 10, yPos - 25);
			context.lineTo(xPos, yPos);
		}

		// player on this ground
		if (background && !playerRendered && playerXPos >= xPos && playerXPos - xPos < tileWidth && playerOnFloor) {
			playerRendered = true;
			renderPlayerPath(context, player);
			context.moveTo(xPos, yPos);
		}
	});

	context.lineTo(viewport.width, viewport.height);

	if (background) {
		context.stroke();
	} else {
		context.fill();
	}

	if (background && !playerRendered) {
		context.beginPath();
		renderPlayerPath(context, player);
		context.closePath();
		context.stroke();
	}

}

function renderPlayerPath(context, player, ghost) {
	var onFloor = player.onFloor;
	var scale = onFloor ? 1 : 1 + 1 / (Math.abs(player.acceleration / 10) + 1);
	var xPos = player.left;
	var yPos = viewport.height - player.bottom + (!ghost ? 2 : 0);
	var size = ghost ? 12 : 16;

	context.moveTo(xPos, yPos);

	if (!darkColor) {
		context.lineTo(xPos - size, yPos - size * scale);
		context.lineTo(xPos, yPos - size * 2);
		context.lineTo(xPos + size, yPos - size * scale);
	} else {
		context.lineTo(xPos - size, yPos - size - scale * size / 2);
		context.lineTo(xPos, yPos - size);
		context.lineTo(xPos + size, yPos - size - scale * size / 2);
	}

	context.lineTo(xPos, yPos);
}

function renderPlayer(player, ghost, stage) {

	var color = "hsl(" + stage.color[0] + ",100%,70%)";
	var onFloor = player.onFloor;
	var context = _canvasEl.getContext("2d");

	context.beginPath();

	if (!darkColor) {
		applyCellShadingStyle(context);

		if (onFloor) {
			applyNoStyle(context);
		} else {
			applyStandardStyle(context);
		}
		context.fillStyle = ghost ? "rgba(0,0,0,0.1)" : color;

	} else {
		applyStandardStyle(context);
		context.fillStyle = ghost ? "rgba(255,255,255,0.1)" : color;
	}

	renderPlayerPath(context, player, ghost);
	context.closePath();
	context.fill();
}

function renderBackground(stage) {
	var background = stage.background;
	var context = _canvasEl.getContext("2d");
	var color1 = "hsl(" + stage.color[0] + ",100%," + (darkColor ? "7" : "80") + "%)";
	var color2 = "hsl(" + stage.color[0] + ",100%," + (darkColor ? "27" : "60") + "%)";

	// create gradient
	var gradient = context.createLinearGradient(0, viewport.height - bgBottomLimit, 0, viewport.height - bgTopLimit);
	gradient.addColorStop(0, color1);
	gradient.addColorStop(1, color2);

	applyNoStyle(context);
	context.fillStyle = gradient;

	context.beginPath();
	context.moveTo(0, viewport.height);

	background.forEach(function(point) {
		context.lineTo(point.left, viewport.height - point.bottom);
	});

	context.lineTo(viewport.width, viewport.height);

	context.fill();
}

function render(stage) {
	renderPrepare();
	renderBackground(stage);

	// drop shadow and cell shading
	renderGround(stage, true);

	// front rendering
	renderGround(stage);
	stage.players.forEach(function(player, index) {
		renderPlayer(player, !!index, stage);
	});
}

/*
 *
 *
 *
 * GAME RULES
 *
 *
 *
 */

function updateGround(ground, dif, game) {
	var nbTiles = ground.length;

	// adjust ground left
	ground.forEach(function(item, index) {
		item.left -= dif * game.speed;
	});

	// filter out of view tiles
	ground = ground.filter(function(item) {
		return item.left > -tileWidth;
	});

	// insert new tiles
	while (ground.length < nbTiles) {
		var lastTile = ground[ground.length - 1];
		var newTile = {
			left: lastTile.left + tileWidth
		};

		var withVariation = game.noVary < 0;
		var variation = withVariation ? game.variationBase : 0;
		var diff = variation ? -variation / 2 + game.rand() * variation : 0;

		// make sure gap is a real gap
		if (withVariation) {
			if (diff > 0) {
				diff += 20;
			} else {
				diff -= 20;
			}

			// no variation for 10 cycles
			game.noVary = game.noVaryBase + Math.floor(game.rand() * game.nextGapTileBase);
		} else {
			// update the noVary value
			game.noVary--;
		}

		newTile.height = Math.max(Math.min(lastTile.height + diff, topLimit), bottomLimit);

		// predictive lvlup
		if (!game.lvlUpTile && game.total + newTile.left / game.speed > game.nextLevel) {
			game.lvlUpTile = true;
			newTile.lvlUp = true;
		}
		ground.push(newTile);
	}

	return ground;
}

function handleAction(player, ghost) {

	if (!player.action) {
		return false;
	}
	player.action = false;

	if (!player.onFloor && player.dblJump) {
		if (player.acceleration > 0) {
			player.acceleration = 0;
		}
	} else {
		if (player.onFloor) {
			player.onFloor = false;
			player.dblJump = false;
			player.acceleration = -acceleration;
			player.bottom += 10;
		} else {
			player.dblJump = true;
			player.acceleration = -acceleration * 3 / 4;
			if (!ghost && (darkColor || Math.random() < 0.5)) {
				darkColor = !darkColor;
			}
		}
	}
	return !ghost;
}

function updatePlayer(player, dif, game, ground) {

	if (player.out) {
		return;
	}

	// handle action
	if (handleAction(player, player.ghost)) {
		game.changeColor = true;
		game.actions.push(game.total);
	}

	// adjust player on its tile
	var playerTile = ground[Math.floor((player.left + 14) / tileWidth)];
	var target = playerTile ? playerTile.height : 0;
	var diff = player.bottom - target;
	var absoluteDiff = diff < 0 ? -diff : diff;
	var tileContact = false;

	if (playerTile && absoluteDiff < 10 && player.onFloor) {
		player.bottom = target;
		player.acceleration = 0;
	} else if (playerTile && diff > 0) {
		player.acceleration = player.acceleration + dif / 20;
		player.bottom = player.bottom - player.acceleration;
		if (player.bottom - target < 3) {
			player.bottom = target;
			player.onFloor = true;
			player.dblJump = false;
		}
	} else {
		player.onFloor = true;
		player.dblJump = false;
		tileContact = true;
		player.horizontalAcceleration = -baseSpeed * game.speed;
		if (!playerTile) {
			if (player.ghost) {
				player.out = true;
				return;
			}

			gameOver = true;
			return;
		} else {
			player.bottom = playerTile.height;
		}
	}

	if (!tileContact) {
		// adjust player left
		player.horizontalAcceleration += dif / 3;

		if (player.horizontalAcceleration > 20) {
			player.horizontalAcceleration = 20;
		}

		player.left += player.horizontalAcceleration / 10;
		if (player.left > 120) {
			player.left = 120;
		}
	}
}

function updateBackground(background, dif, game) {
	var outOfScreen = 0;
	// update left and count out of screen
	background.forEach(function(point) {
		point.left -= dif / backgroundSpeed;
		if (point.left < 0) {
			outOfScreen++;
		}
	});
	// remove out of screen
	if (outOfScreen > 1) {
		background.splice(0, outOfScreen - 1);
	}
	if (!background.length) {
		background.push({
			left: 0,
			bottom: 0
		});
	}

	var nbPoints = background.length;
	var last = background[nbPoints - 1];

	while (last.left < viewport.width) {
		var lastBottom = last.bottom;
		var target = Math.floor(jitter(bgMiddle, bgJitter, function(x) {
			return x * x;
		}));
		var left = last.left + (lastBottom > target ? lastBottom - target : target - lastBottom);
		// remove unused points as it will be aligned
		var beforeLast = background[nbPoints - 2];
		if (beforeLast) {
			if ((beforeLast.bottom - lastBottom) * (lastBottom - target) > 0) {
				background.pop();
				nbPoints--;
			}
		}
		background.push({
			bottom: target,
			left: left
		});
		nbPoints++;
		last = background[nbPoints - 1];
	}

	return background;
}

function updateEnv(stage, dif) {
	// adjust ground
	stage.ground = updateGround(stage.ground, dif, stage.game);

	// adjust background
	stage.background = updateBackground(stage.background, dif);

	// adjust players
	stage.players.forEach(function(player) {
		updatePlayer(player, dif, stage.game, stage.ground);
	});
}

function lvlUp(game) {
	game.lvlUp = true;
	game.nextLevel += lvlupGap;
	game.noVaryBase = game.noVaryBase * 0.9;
	game.nextGapTileBase = game.nextGapTileBase * 0.9;
	game.speed = game.speed * 1.1;
	game.variationBase = game.variationBase * 1.1;
	game.lvlUpTile = false;
}

function colorize(stage) {
	var now = Date.now();
	if (stage.color && stage.color[2] == darkColor && now < stage.color[3]) {
		return;
	}
	// generate a random color
	var color = Math.floor(Math.random() * 360);
	var light = darkColor ? "7%" : "80%";
	document.body.style.backgroundColor = "hsl(" + color + ", 100%, " + light + ")";
	stage.color = [color, light, darkColor, now + colorTimeout];
}

/*
 *
 *
 *
 * GAME LOOP
 *
 *
 *
 */

function loop() {

	var clock = stage.clock;
	if (!clock) {
		clock = new Clock();
		stage.clock = clock;
	}
	var game = stage.game;
	var total = clock.total();
	var chunk = 10;
	var dif = clock.tick(chunk);
	var updateGhost = function(player) {
		if (!player.ghost) {
			return;
		}
		if (player.actions.indexOf(total) != -1) {
			player.action = true;
		}
	};

	if (dif > 2000) {
		gameOver = true;
	}

	// update the environment
	do {
		if (dif) {

			if (!gameOver) {
				total += chunk;
				game.total = total;

				// update ghosts
				stage.players.forEach(updateGhost);

				updateEnv(stage, chunk);

				// lvl up ?
				if (total > game.nextLevel) {
					lvlUp(game);
				}
			}

			if (gameOver) {
				log(stage.game.actions);
				showGameOver(total);
				return;
			}

		}
		dif = dif - chunk;
		if (dif < 0) {
			dif = 0;
		}
	} while (dif);

	// update the display
	render(stage);

	if (game.lvlUp) {
		game.lvlUp = false;
		_lvlUpEl.classList.add("show");
		setTimeout(function() {
			_lvlUpEl.classList.remove("show");
		}, 1500);
	}

	if (game.changeColor) {
		game.changeColor = false;
		colorize(stage);
	}

	_scoreEl.innerHTML = "score: " + Math.floor(total);

	requestAnimationFrame(loop);
}

/*
 *
 *
 *
 * GAME STATES
 *
 *
 *
 */

function getPlayer() {
	return {
		dblJump: false,
		acceleration: 0,
		horizontalAcceleration: 0,
		bottom: 100,
		onFloor: true,
		left: 120
	};
}

function start() {
	if (!window.Parse) {
		return loop();
	}

	// retrieve the top track as ghost
	var query = new Parse.Query(Score);
	query.equalTo("seed", seed);
	query.descending("score");
	query.limit(4);
	setVisible(_loadingEl, true);

	var started = false;
	var startLoop = function() {
		if (started) {
			return;
		}
		started = true;
		setVisible(_loadingEl, false);
		loop();
	};
	query.find().then(function(results) {
		if (!started) {
			results.forEach(function(result) {
				var player = getPlayer();
				player.actions = result.get("actions") || [];
				player.ghost = true;
				stage.players.push(player);
			});
		}
		// save highscores and try to retrieve twitter names
		var keys = [];
		var trackHighscores = highscores[seed];
		if (!trackHighscores) {
			trackHighscores = {};
			highscores[seed] = trackHighscores;
		}
		results.forEach(function(result) {
			var score = result.get("score");
			keys.push("score=" + seed + "_" + score);
			var scoreObj = trackHighscores[score];
			if (!scoreObj) {
				scoreObj = {
					score: score
				};
				trackHighscores[score] = scoreObj;
			}
			scoreObj.actions = result.get("actions");
		});
		if (keys.length) {
			getJSON(highscoresUrl + keys.join("&"), function(scores) {
				for (var key in scores) {
					var splitKey = key.split("_");
					trackHighscores[splitKey[1]].tweet = scores[key];
				}
			});
		}

		startLoop();
	});

	// dont want to wait parse for too long
	setTimeout(startLoop, 2000);
}

function init() {
	document.body.classList.remove("gameover");
	setVisible(_gameOverEl, false);
	setVisible(_splashEl, false);

	// init viewport
	viewport = document.body.getBoundingClientRect();
	// copy into new object so it can be modified
	viewport = {
		width: viewport.width,
		height: viewport.height
	};
	if (viewport.height < 500) {
		viewport.height = viewport.height * 2;
		viewport.width = viewport.width * 2;
	}
	gameOver = false;

	// init ground
	var ground = [];
	var nbTiles = Math.floor(viewport.width / tileWidth) + 2;
	for (var i = 0; i < nbTiles; i++) {
		ground.push({
			height: 100,
			left: i * tileWidth
		});
	}

	stage = {
		ground: ground,
		background: [],
		players: [getPlayer()],
		game: {
			speed: 1.1,
			noVary: 200,
			noVaryBase: 10,
			nextGapTileBase: 30,
			variationBase: 200,
			nextLevel: lvlupGap,
			actions: []
		}
	};

	colorize(stage);

	// init rand method. Use seed if provided
	var hash = parseInt(window.location.hash.substr(1), 10);
	seed = isNaN(hash) ? Math.floor(Math.random() * 100000000) : hash;
	log("Gwoek playing with seed " + seed);

	var generator = new MersenneTwister(seed);
	stage.game.rand = function() {
		return generator.random();
	};
	window.location.hash = "#" + seed;

	// init canvas
	_canvasEl.width = viewport.width;
	_canvasEl.height = viewport.height;

	start();
}

function showGameOver(score) {
	ga("send", "event", "score", "session", "Score", score);
	if (score > topScore) {
		topScore = score;
		_topScoreEl.innerHTML = "Top score: " + topScore;
		// save to ga
		if (window.ga) {
			ga("send", "event", "score", "top", "Top score", topScore);
		}
	}

	// save to highscores
	if (!highscores[seed]) {
		highscores[seed] = {};
	}
	highscores[seed][score] = {
		actions: stage.game.actions,
		score: score,
		you: true
	};

	if (window.Parse) {
		// save to parse
		var saved = new Score();
		saved.save({
			seed: seed,
			score: score,
			actions: stage.game.actions,
			ACL: publicACL
		}).then(function() {
			log("Score " + score + " for seed " + seed + " saved.");
		});
	}

	setVisible(_gameOverEl, true);
	_lvlUpEl.classList.remove("show");
	document.body.classList.add("gameover");
	_twitterEl.href = "https://twitter.com/home?status=" +
		encodeURIComponent(twitterMsg.replace(/\{score\}/g, score).replace(/\{seed\}/g, seed));

	// 2s before restart with space
	setTimeout(function() {
		withSplash = true;
	}, 2000);
}

function showHighScores() {
	var trackHighscores = highscores[seed];
	var orderedHighscores = Object.keys(trackHighscores)
		.map(parseFloat)
		.sort(function(a, b) {
			return b - a;
		})
		.map(function(key) {
			return trackHighscores[key];
		}).forEach(function(result, index) {
			var line = $("#trackscores tr:nth-child(" + (index + 1) + ")");
			if (!line) {
				return;
			}
			var by = "- - -";
			var img = "";
			var tweet = result.tweet;
			if (result.you) {
				by = "YOU!";
			} else if (tweet) {
				var url = twitterLink.replace(/\{user\}/g, tweet.user).replace(/\{id\}/g, tweet.id);
				by = "<a href=\"" + url + "\">@" + tweet.user + "</a>";
				img = "<img src=\"" + tweet.img + "\"/>";
			}
			line.innerHTML = "<td>" + img + "</td><td>" + result.score + "</td><td> by </td><td>" + by + "</td>";
		});
	setVisible(_gameOverEl, false);
	setVisible(_highscoresShow, true);
}

function hideHighScores() {
	setVisible(_gameOverEl, true);
	setVisible(_highscoresShow, false);
}

/*
 *
 *
 *
 * ACTION HANDLERS
 *
 *
 *
 */

function onAction() {
	if (gameOver) {
		if (withSplash) {
			withSplash = false;
			init();
		}
		return;
	}

	var player = stage.players[0];
	player.action = true;
}

function bindAction(element, listener) {
	var wrapper = function(event) {
		event.preventDefault();
		listener();
	};
	element.addEventListener("click", wrapper);
	element.addEventListener("touchstart", wrapper);
}

document.addEventListener("DOMContentLoaded", function(e) {
	// event listeners
	document.addEventListener("keydown", onAction);
	document.addEventListener("touchstart", function(e) {
		e.preventDefault();
		onAction();
	});

	// update on resize
	window.addEventListener("resize", function() {
		if (!withSplash) {
			init();
		}
	});

	// retry and try new
	function onRetry(event) {
		init();
	}

	function onTryNew(event) {
		window.location.hash = "";
		init();
	}

	bindAction($("#retry"), onRetry);
	bindAction($("#trynew"), onTryNew);
	bindAction($("#highscores"), showHighScores);
	bindAction($("#highscoresShow"), hideHighScores);

	if (window.Parse) {
		// Start Parse for scores and renderPlayer
		Parse.initialize("zQmQG1Bj9kRsAieCxyAqulbHFZeDWcHuXp9051y3", "k0VfXT2he22Kseb1yw7YciqUaAJK68Sc0sxoRBbN");
	}

});
