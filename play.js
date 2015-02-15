var ground = [],
	nbTiles = 100,
	tileWidth = 20,

	clouds = [],
	cloudsCoolDown = 0,

	// game variables
	gameOver = true,
	withSplash = true,
	shift = 0,
	noVary = false,
	newLevel = 200,
	darkColor = false,
	verticalScale = 1,

	playerDblJump = false,
	playerAcceleration = 0,
	playerHorizontalAcceleration = 0,
	playerBottom = 100,
	playerLeft = 120,
	playerOnFloor = true,

	now,
	delta,
	viewport,

	score = 0,
	topScore = 0,

	// limits for random ground generation
	noVaryBase = 10,
	withVariationBase = 0.1,
	topLimit = 300,
	bottomLimit = 20,

	// some dom elements
	_environment = document.getElementById("environment"),
	_dino = document.getElementById("dino"),
	_score = document.getElementById("score"),

	// dom helpers
	setVisible = function (id, visible) {
		document.getElementById(id).style.display = visible ? "block" : "none";
	},

	// random generator
	seed = 0,
	rand = null,

	loop = function () {
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
					if (!noVary || noVary < 0) {
						noVary = false;
					} else {
						noVary--;
					}
					var withVariation = !noVary && rand() < withVariationBase,
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
						noVary = noVaryBase;
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

		// adjust clouds
		if (!cloudsCoolDown) {
			// can create new cloud
			cloudsCoolDown = false;
			if (Math.random() < 0.5) {
				cloudsCoolDown = 150;
				var cloud = document.createElement("div");
				cloud.classList.add("cloud");
				cloud.style.bottom = Math.floor((viewport.height - topLimit - 50) * Math.random()) + topLimit + 25;
				_environment.appendChild(cloud);
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
				ga('send', 'event', 'score', 'session', 'Score', score);
				if (score > topScore) {
					topScore = score;
					document.getElementById("topscore").innerHTML = "Top score: " + topScore;
					ga('send', 'event', 'score', 'top', 'Top score', topScore);
				}
				_dino.style.transform = "scale(1)";
				setVisible("gameover", true);
				setVisible("dino", false);
				document.body.classList.add("gameover");
				document.getElementById("twitter").href = "https://twitter.com/home?status=" +
					encodeURIComponent("Just scored " + score + " on Gwoek! Challenge me on this track here: http://bbaliguet.github.io/Gwoek/#" + seed);
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
		_dino.style.bottom = playerBottom + "px";
		_dino.style.left = playerLeft + "px";
		_dino.style.transform = "scale(" + scale + ")";

		// adjust score
		score = score + delta;
		if (newLevel < 0) {
			newLevel = 200;
			noVaryBase = noVaryBase * 0.8;
			withVariationBase += 0.05;
		} else {
			newLevel = newLevel - delta;
		}

		// adjust sprite
		if (score % 14 < 7) {
			_dino.style.backgroundPosition = "-14px 0px";
		} else {
			_dino.style.backgroundPosition = "0px 0px";
		}
		_score.innerHTML = "score: " + Math.floor(score);

		requestAnimationFrame(loop);
	},

	updateClock = function () {
		var previous = now;
		if (now) {
			now = Date.now();
			delta = (now - previous) * 60 / 1000;
		} else {
			now = Date.now();
			delta = 1;
		}
	},

	init = function () {
		document.body.classList.remove("gameover");
		setVisible("gameover", false);
		setVisible("splash", false);
		setVisible("dino", true);
		viewport = document.body.getBoundingClientRect();
		gameOver = false;

		// init ground
		nbTiles = Math.floor(viewport.width / 20) + 2;
		_environment.innerHTML = "";
		ground.splice(0, ground.length);
		for (var i = 0; i < nbTiles; i++) {
			var tile = document.createElement("div");
			ground.push({
				height: 100,
				tile: tile
			});
			tile.classList.add("ground");
			_environment.appendChild(tile);
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
		withVariationBase = 0.1;

		// init clock
		now = 0;
		delta = 1;

		// init rand method. Use seed if provided
		var hash = parseInt(window.location.hash.substr(1), 10);
		seed = isNaN(hash) ? Math.floor(Math.random() * 100000000) : hash;
		var generator = new MersenneTwister(seed);
		rand = function () {
			return generator.random();
		};
		window.location.hash = "#" + seed;
		
		// start loop
		loop();
	};

// event listener
var onAction = function () {
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
};

// event listeners
document.addEventListener("keydown", onAction);
document.addEventListener("touchstart", function (e) {
	e.preventDefault();
	onAction();
});

// update on resize
window.addEventListener("resize", function () {
	init();
});

// retry and try new
document.getElementById("retry").addEventListener("click", function (event) {
	event.preventDefault();
	init();
});
document.getElementById("trynew").addEventListener("click", function (event) {
	event.preventDefault();
	window.location.hash = "";
	init();
});
