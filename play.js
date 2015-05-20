var $ = document.querySelector.bind(document);

var ground = [];
var nbTiles = 100;
var tileWidth = 20;

var clouds = [];
var cloudsCoolDown = 0;

// game variables
var gameOver = true;
var withSplash = true;
var shift = 0;
var noVary = -1;
var newLevel = 200;
var darkColor = false;
var verticalScale = 1;

var playerDblJump = false;
var playerAcceleration = 0;
var playerHorizontalAcceleration = 0;
var playerBottom = 100;
var playerLeft = 120;
var playerOnFloor = true;

var now;
var delta;
var viewport;

var score = 0;
var topScore = 0;

// limits for random ground generation
var noVaryBase = 10;
var nextGapTileBase = 30;
var topLimit = 300;
var bottomLimit = 20;

// some dom elements
var _environmentEl = $("#environment");
var _dinoEl = $("#dino");
var _scoreEl = $("#score");
var _topScoreEl = $("#topscore");
var _twitterEl = $("#twitter");
var _gameOverEl = $("#gameover");
var _splashEl = $("#splash");

// dom helpers
function setVisible(el, visible) {
	el.style.display = visible ? "block" : "none";
}

// random generator
var seed = 0;
var rand = null;

function loop() {
	var swap = false;

	updateClock();

	if (shift > tileWidth * 10) {
		// cheating !
		gameOver = true;
	}

	if (shift >= tileWidth) {
		shift = Math.round(shift) % tileWidth;
		swap = true;
	}

	// adjust ground
	ground.forEach(function (item, index) {
		var tile = item.tile;
		tile.style.left = index * tileWidth - shift;
		if (swap) {
			if (index < nbTiles - 1) {
				item.height = ground[index + 1].height;
			} else {
				var withVariation = noVary < 0,
					variation = withVariation ? 200 : 4,
					diff = -variation / 2 + rand() * variation;

				// make sure gap is a real gap
				if (withVariation) {
					if (diff > 0) {
						diff += 20;
					} else {
						diff -= 20;
					}

					// no variation for 10 cycles
					noVary = noVaryBase + Math.floor(rand() * nextGapTileBase);
				}

				item.height = Math.max(Math.min(item.height + diff, topLimit), bottomLimit);
			}

			var adjust = 1;
			if (index > nbTiles * 4 / 5) {
				adjust = (nbTiles - index) / (nbTiles / 5);
			}

			tile.style.height = adjust * item.height + "px";
			tile.style.opacity = 0.5 + adjust / 2;
		}
	});

	shift = shift + (10 * delta);
	noVary = noVary - delta;

	// adjust clouds
	if (!cloudsCoolDown) {
		// can create new cloud
		cloudsCoolDown = false;
		if (Math.random() < 0.5) {
			cloudsCoolDown = 150;
			var cloud = document.createElement("div");
			cloud.classList.add("cloud");
			cloud.style.bottom = Math.floor((viewport.height - topLimit - 50) * Math.random()) + topLimit + 25;
			_environmentEl.appendChild(cloud);
			clouds.push({
				cloud: cloud,
				left: viewport.width
			});
		}
	} else {
		cloudsCoolDown--;
	}

	// adjuste cloud position
	clouds.forEach(function (cloud) {
		cloud.left -= delta * 2;
		cloud.cloud.style.left = cloud.left;
	});

	// remove dead clouds
	clouds = clouds.filter(function (cloud) {
		return cloud.left > -200;
	});

	// adjust player on its tile
	var playerTile = ground[Math.floor((playerLeft + 14) / tileWidth)],
		target = playerTile ? playerTile.height : 0,
		diff = playerBottom - target,
		absoluteDiff = diff < 0 ? -diff : diff;

	if (!gameOver && playerTile && absoluteDiff < 20 && playerOnFloor) {
		playerBottom = target;
		playerAcceleration = 0;
		playerOnFloor = true;
		playerDblJump = false;
	} else if (!gameOver && playerTile && diff > 0) {
		playerAcceleration = playerAcceleration + delta;
		playerBottom = playerBottom - (delta * playerAcceleration);
		if (playerBottom - target < 3) {
			playerBottom = target;
			playerOnFloor = true;
			playerDblJump = false;
		}
	} else {
		playerHorizontalAcceleration = -8;
		if (!playerTile || gameOver) {
			// GAME OVER
			gameOver = true;
			score = Math.floor(score);
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
			return;
		} else {
			playerBottom = playerTile.height;
		}
	}

	// adjust player left
	playerHorizontalAcceleration += delta / 3;
	if (playerHorizontalAcceleration > 1) {
		playerHorizontalAcceleration = 1;
	}

	playerLeft += playerHorizontalAcceleration * delta;
	if (playerLeft > 120) {
		playerLeft = 120;
	}

	var scale = playerOnFloor ? 1 : 1 + 1 / (Math.abs(playerAcceleration / 20) + 1);
	_dinoEl.style.bottom = playerBottom + "px";
	_dinoEl.style.left = playerLeft + "px";
	_dinoEl.style.transform = "scale(" + scale + ")";

	// adjust score
	score = score + delta;
	if (newLevel < 0) {
		newLevel = 200;
		noVaryBase = noVaryBase * 0.8;
		nextGapTileBase = nextGapTileBase * 0.8;
	} else {
		newLevel = newLevel - delta;
	}

	// adjust sprite (4 phases, 14px width)
	_dinoEl.style.backgroundPosition = "-" + (14 * (Math.floor(score / 9) % 4)) + "px 0px";
	_scoreEl.innerHTML = "score: " + Math.floor(score);

	requestAnimationFrame(loop);
}

function updateClock() {
	var previous = now;
	if (now) {
		now = Date.now();
		delta = (now - previous) * 60 / 1000;
	} else {
		now = Date.now();
		delta = 1;
	}
}

function init() {
	document.body.classList.remove("gameover");
	setVisible(_gameOverEl, false);
	setVisible(_splashEl, false);
	setVisible(_dinoEl, true);
	viewport = document.body.getBoundingClientRect();
	gameOver = false;

	// init ground
	nbTiles = Math.floor(viewport.width / 20) + 2;
	_environmentEl.innerHTML = "";
	ground.splice(0, ground.length);
	for (var i = 0; i < nbTiles; i++) {
		var tile = document.createElement("div");
		ground.push({
			height: 100,
			tile: tile
		});
		tile.classList.add("ground");
		_environmentEl.appendChild(tile);
	}

	// init clouds
	clouds.splice(0, clouds.length);

	// init player
	playerDblJump = false;
	playerAcceleration = 0;
	playerHorizontalAcceleration = 0;
	playerBottom = 100;
	playerOnFloor = true;
	score = 0;
	playerLeft = 120;
	noVaryBase = 10;
	nextGapTileBase = 30;

	// init clock
	now = 0;
	delta = 1;

	// init rand method. Use seed if provided
	var hash = parseInt(window.location.hash.substr(1), 10);
	seed = isNaN(hash) ? Math.floor(Math.random() * 100000000) : hash;
	if (window.console) {
		console.log("Gwoek playing with seed " + seed);
	}

	var generator = new MersenneTwister(seed);
	rand = function () {
		return generator.random();
	};
	window.location.hash = "#" + seed;

	// start loop
	loop();
}

function onAction() {
	if (gameOver) {
		if (withSplash) {
			withSplash = false;
			init();
		}

		return;
	}

	if (!playerOnFloor && playerDblJump) {
		if (playerAcceleration > 0) {
			playerAcceleration = 0;
		}
	} else {
		if (playerOnFloor) {
			playerOnFloor = false;
			playerAcceleration = -20;
			playerBottom += 10;
		} else {
			playerDblJump = true;
			playerAcceleration = -15;
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
