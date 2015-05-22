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

/*
 *
 *
 *
 * DOM ELEMENTS
 *
 *
 *
 */

var _environmentEl = $("#environment");
var _dinoEl = $("#dino");
var _scoreEl = $("#score");
var _topScoreEl = $("#topscore");
var _twitterEl = $("#twitter");
var _gameOverEl = $("#gameover");
var _splashEl = $("#splash");

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
var noVaryBase = 10;
var nextGapTileBase = 30;
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
Clock.prototype.tick = function (min) {
	var now = Date.now();
	var dif = now - this.now;
	if (dif > min) {
		this.now = now;
		return dif;
	}
	return 0;
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

function renderGround(ground) {

}

function renderClouds(clouds) {

}

function renderPlayer(player) {
	/*
	var scale = playerOnFloor ? 1 : 1 + 1 / (Math.abs(playerAcceleration / 20) + 1);
	_dinoEl.style.bottom = playerBottom + "px";
	_dinoEl.style.left = playerLeft + "px";
	_dinoEl.style.transform = "scale(" + scale + ")";
	_dinoEl.style.backgroundPosition = "-" + (14 * (Math.floor(score / 9) % 4)) + "px 0px";
	*/
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
		item.left -= dif;
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
		var variation = withVariation ? 200 : 4;
		var diff = -variation / 2 + game.rand() * variation;

		// make sure gap is a real gap
		if (withVariation) {
			if (diff > 0) {
				diff += 20;
			} else {
				diff -= 20;
			}

			// no variation for 10 cycles
			game.noVary = noVaryBase + Math.floor(game.rand() * nextGapTileBase);
		} else {
			// update the noVary value
			game.noVary--;
		}

		newTile.height = Math.max(Math.min(lastTile.height + diff, topLimit), bottomLimit);
		ground.push(newTile);
	}

	return ground;
}

function updateClouds(clouds, dif, game) {
	// adjust clouds
	if (!game.cloudsCoolDown) {
		// can create new cloud
		game.cloudsCoolDown = false;
		if (Math.random() < 0.5) {
			game.cloudsCoolDown = 150;
			var cloud = {
				bottom: Math.floor((viewport.height - topLimit - 50) * Math.random()) + topLimit + 25,
				left: viewport.left
			};
			clouds.push(cloud);
		}
	} else {
		game.cloudsCoolDown--;
	}

	// adjuste cloud position
	clouds.forEach(function (cloud) {
		cloud.left -= dif * 2;
	});

	// remove dead clouds
	clouds = clouds.filter(function (cloud) {
		return cloud.left > -200;
	});

	return clouds;
}

function updatePlayer(player, dif, game, ground) {

	// adjust player on its tile
	var playerTile = ground[Math.floor((player.left + 14) / tileWidth)];
	var target = playerTile ? playerTile.height : 0;
	var diff = player.bottom - target;
	var absoluteDiff = diff < 0 ? -diff : diff;

	if (playerTile && absoluteDiff < 20 && player.onFloor) {
		player.bottom = target;
		player.acceleration = 0;
		player.onFloor = true;
		player.dblJump = false;
	} else if (playerTile && diff > 0) {
		player.acceleration = player.acceleration + dif;
		player.bottom = player.bottom - player.acceleration;
		if (player.bottom - target < 3) {
			player.bottom = target;
			player.onFloor = true;
			player.dblJump = false;
		}
	} else {
		player.horizontalAcceleration = -8;
		if (!playerTile) {
			gameOver = true;
			return;
		} else {
			player.bottom = playerTile.height;
		}
	}

	// adjust player left
	player.horizontalAcceleration += dif;
	if (player.horizontalAcceleration > 1) {
		player.horizontalAcceleration = 1;
	}
	player.left += player.horizontalAcceleration / 10;
	if (player.left > 120) {
		player.left = 120;
	}

	return player;
}

function updateEnv(stage, dif, game) {
	// adjust ground
	stage.ground = updateGround(stage.ground, dif, stage.game);
	// adjust clouds
	stage.clouds = updateClouds(stage.clouds, dif, stage.game);
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
	var dif;

	// update the environment
	do {
		dif = stage.clock.tick(stage.game.speed);
		if (dif) {
			updateEnv(stage, dif);
		}
	} while(dif);

	// update the display
	renderGround(stage.ground);
	renderClouds(stage.clouds);
	renderPlayer(stage.player);

	_scoreEl.innerHTML = "score: " + Math.floor(clock.total());

	if (gameOver) {
		return;
	}

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
	setVisible(_dinoEl, true);

	// init viewport
	viewport = document.body.getBoundingClientRect();
	gameOver = false;

	// init ground
	var ground = [];
	var nbTiles = Math.floor(viewport.width / tileWidth) + 1;
	for (var i = 0; i < nbTiles; i++) {
		ground.push({
			height: 100,
			left: i * tileWidth
		});
	}

	stage = {
		ground: ground,
		clouds: [],
		player: {
			dblJump: false,
			acceleration: 0,
			horizontalAcceleration: 0,
			bottom: 100,
			onFloor: true,
			left: 120
		},
		game: {
			speed: 10
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
	
	

	// start loop
	loop();
}

function showGameOver(game) {
	var score = Math.floor(stage.clock.total());
	ga("send", "event", "score", "session", "Score", score);
	if (score > topScore) {
		topScore = score;
		_topScoreEl.innerHTML = "Top score: " + topScore;
		ga("send", "event", "score", "top", "Top score", topScore);
	}

	_dinoEl.style.transform = "scale(1)";
	setVisible(_gameOverEl, true);
	setVisible(_dinoEl, false);
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
				var classList = document.body.classList;
				if (darkColor) {
					classList.add("dark");
				} else {
					classList.remove("dark");
				}
			}
		}
	}

	// generate a random color
	var color = Math.floor(Math.random() * 360),
		light = darkColor ? "7%" : "80%";
	document.body.style.backgroundColor = "hsl(" + color + ", 100%, " + light + ")";
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
