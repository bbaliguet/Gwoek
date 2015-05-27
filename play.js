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

function jitter(origin, value) {
	return origin + value * Math.random() - value / 2;
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
var _canvas = $("#canvas");

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

// environment: tiles and clouds
var tileWidth = 20;

// limits for random ground generation
var topLimit = 300;
var bottomLimit = 20;

// random generator
var seed = 0;

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
var Clock = function () {
	this.now = Date.now();
	this.start = this.now;
};
Clock.prototype.tick = function (chunk) {
	var now = Date.now();
	var dif = now - this.now;
	dif = dif - dif % chunk;
	this.now = this.now + dif;
	return dif;
};
Clock.prototype.total = function () {
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

function renderPrepare() {
	var context = _canvas.getContext("2d");
	context.clearRect(0, 0, viewport.width, viewport.height);
}

function renderGround(ground) {
	var context = _canvas.getContext("2d");
	context.fillStyle = "#fff";
	context.strokeStyle = "rgba(0,0,0,0.1)";
	context.lineWidth = 1;
	context.beginPath();
	context.moveTo(0, viewport.height);
	ground.forEach(function (item) {
		var xPos = item.left;
		var yPos = viewport.height - item.height;
		context.lineTo(xPos, yPos);
	});
	context.lineTo(viewport.width, viewport.height);
	context.fill();
	context.stroke();
}

function renderPlayer(player) {
	var scale = player.onFloor ? 1 : 1 + 1 / (Math.abs(player.acceleration / 10) + 1);
	var xPos = player.left;
	var yPos = viewport.height - player.bottom;
	var context = _canvas.getContext("2d");
	var size = 20;
	context.fillStyle = "rgba(0,0,0,0.8)";
	context.beginPath();
	context.moveTo(xPos, yPos);
	context.lineTo(xPos - size, yPos - size * scale);
	context.lineTo(xPos, yPos - size * 2);
	context.lineTo(xPos + size, yPos - size * scale);
	context.fill();
}

function renderBackground(background) {

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
	ground.forEach(function (item, index) {
		item.left -= dif * game.speed;
	});

	// filter out of view tiles
	ground = ground.filter(function (item) {
		return item.left > -tileWidth;
	});

	// insert new tiles
	while (ground.length < nbTiles) {
		var lastTile = ground[ground.length - 1];
		var newTile = {
			left: lastTile.left + tileWidth
		};

		var withVariation = game.noVary < 0;
		var variation = withVariation ? game.variationBase: 4;
		var diff = -variation / 2 + game.rand() * variation;

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
		ground.push(newTile);
	}

	return ground;
}

function handleAction(player) {

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
			player.acceleration = -20;
			player.bottom += 10;
		} else {
			player.dblJump = true;
			player.acceleration = -15;
			if (darkColor || Math.random() < 0.5) {
				darkColor = !darkColor;
			}
		}
	}
	return true;
}

function updatePlayer(player, dif, game, ground) {

	// handle action
	if (handleAction(player)) {
		game.changeColor = true;
		game.actions.push(game.total);
	}

	// adjust player on its tile
	var playerTile = ground[Math.floor((player.left + 14) / tileWidth)];
	var target = playerTile ? playerTile.height : 0;
	var diff = player.bottom - target;
	var absoluteDiff = diff < 0 ? -diff : diff;
	var tileContact = false;

	if (playerTile && absoluteDiff < 20 && player.onFloor) {
		player.bottom = target;
		player.acceleration = 0;
		player.onFloor = true;
		player.dblJump = false;
	} else if (playerTile && diff > 0) {
		player.acceleration = player.acceleration + dif / 20;
		player.bottom = player.bottom - player.acceleration;
		if (player.bottom - target < 3) {
			player.bottom = target;
			player.onFloor = true;
			player.dblJump = false;
		}
	} else {
		tileContact = true;
		player.horizontalAcceleration = -100 * game.speed;
		if (!playerTile) {
			gameOver = true;
			return player;
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

	return player;
}

function updateBackground() {

}

function updateEnv(stage, dif, game) {
	// adjust ground
	stage.ground = updateGround(stage.ground, dif, stage.game);
	// adjust background
	stage.background = updateBackground(stage.background, dif, game);
	// adjust player
	stage.player = updatePlayer(stage.player, dif, stage.game, stage.ground);
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
	var game = stage.game;
	var previousTotal = clock.total();
	var chunk = 10;
	var dif = clock.tick(chunk);

	// update the environment
	do {
		if (dif) {
			previousTotal += chunk;
			game.total = previousTotal;
			updateEnv(stage, chunk);
			// lvl up ?
			if (previousTotal > game.nextLevel) {
				game.nextLevel += 5000;
				game.noVaryBase = game.noVaryBase * 0.9;
				game.nextGapTileBase = game.nextGapTileBase * 0.9;
				game.speed = game.speed * 1.1;
				game.variationBase = game.variationBase * 1.1;
			}

			if (gameOver) {
				console.log(stage.game.actions);
				showGameOver(previousTotal);
				return;
			}

		}
		dif = dif - chunk;
		if (dif < 0) {
			dif = 0;
		}
	} while (dif);

	// update the display
	renderPrepare();
	renderBackground(stage.background);
	renderGround(stage.ground);
	renderPlayer(stage.player);

	if (game.changeColor) {
		game.changeColor = false;
		// generate a random color
		var color = Math.floor(Math.random() * 360),
			light = darkColor ? "7%" : "80%";
		document.body.style.backgroundColor = "hsl(" + color + ", 100%, " + light + ")";
	}

	_scoreEl.innerHTML = "score: " + Math.floor(previousTotal);


	requestAnimationFrame(function () {
		loop();
	});
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

function init() {
	document.body.classList.remove("gameover");
	setVisible(_gameOverEl, false);
	setVisible(_splashEl, false);

	// init viewport
	viewport = document.body.getBoundingClientRect();
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
		player: {
			dblJump: false,
			acceleration: 0,
			horizontalAcceleration: 0,
			bottom: 100,
			onFloor: true,
			left: 120
		},
		game: {
			speed: 1,
			noVary: 200,
			noVaryBase: 10,
			nextGapTileBase: 30,
			variationBase: 200,
			nextLevel: 5000,
			actions: []
		},
		clock: new Clock()
	};


	// init rand method. Use seed if provided
	var hash = parseInt(window.location.hash.substr(1), 10);
	seed = isNaN(hash) ? Math.floor(Math.random() * 100000000) : hash;
	if (window.console) {
		console.log("Gwoek playing with seed " + seed);
	}

	var generator = new MersenneTwister(seed);
	stage.game.rand = function () {
		return generator.random();
	};
	window.location.hash = "#" + seed;

	// init canvas
	_canvas.width = viewport.width;
	_canvas.height = viewport.height;

	// start loop
	loop();
}

function showGameOver(score) {
	ga("send", "event", "score", "session", "Score", score);
	if (score > topScore) {
		topScore = score;
		_topScoreEl.innerHTML = "Top score: " + topScore;
		ga("send", "event", "score", "top", "Top score", topScore);
	}

	setVisible(_gameOverEl, true);
	document.body.classList.add("gameover");
	_twitterEl.href = "https://twitter.com/home?status=" +
		encodeURIComponent("Just scored " + score + " on Gwoek! Challenge me on this track here: http://bbaliguet.github.io/Gwoek/#" + seed);

	// 2s before restart with space
	setTimeout(function () {
		withSplash = true;
	}, 2000);
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

	var player = stage.player;
	player.action = true;
}

document.addEventListener("DOMContentLoaded", function (e) {
	// event listeners
	document.addEventListener("keydown", onAction);
	document.addEventListener("touchstart", function (e) {
		e.preventDefault();
		onAction();
	});

	// update on resize
	window.addEventListener("resize", init);

	// retry and try new
	function onRetry(event) {
		event.preventDefault();
		init();
	}

	function onTryNew(event) {
		event.preventDefault();
		window.location.hash = "";
		init();
	}

	$("#retry").addEventListener("click", onRetry);
	$("#trynew").addEventListener("click", onTryNew);
	$("#retry").addEventListener("touchstart", onRetry);
	$("#trynew").addEventListener("touchstart", onTryNew);
});
