var ground = [],

	clouds = [],
	cloudsCoolDown = 0,

	nbTiles = 100,
	tileWidth = 20,

	shift = 0,
	noVary = false,
	darkColor = false,

	playerDblJump = false,
	playerAcceleration = 0,
	playerBottom = 100,
	playerOnFloor = true,

	gameOver = true,

	now,
	delta,
	viewport,

	score = 0,
	topScore = 0,
	noVaryBase = 10,
	withVariationBase = 0.1,

	loop = function () {
		var swap = false;

		updateClock();

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
					var withVariation = !noVary && Math.random() < withVariationBase,
						variation = withVariation ? 200 : 4,
						diff = -variation / 2 + Math.random() * variation;
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
					item.height = Math.max(Math.min(item.height + diff, 300), 50);
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
			cloudsCoolDown = false;
			if (Math.random() < 0.5) {
				cloudsCoolDown = 150;
				var cloud = document.createElement("div");
				cloud.classList.add("cloud");
				cloud.style.bottom = Math.floor((viewport.height - 350) * Math.random()) + 325;
				document.getElementById("player").appendChild(cloud);
				clouds.push({
					cloud: cloud,
					left: viewport.width
				});
			}
		} else {
			cloudsCoolDown--;
		}
		clouds.forEach(function (cloud) {
			cloud.left -= delta * 2;
			cloud.cloud.style.left = cloud.left;
		});
		// remove dead clouds
		clouds = clouds.filter(function (cloud) {
			return cloud.left > -200;
		});

		// adjust player on 5th tile
		var playerTile = ground[7],
			target = playerTile.height,
			diff = playerBottom - target,
			dino = document.getElementById("dino"),
			absoluteDiff = diff < 0 ? -diff : diff;

		if (absoluteDiff < 20 && playerOnFloor) {
			playerBottom = target;
			playerAcceleration = 0;
			playerOnFloor = true;
			playerDblJump = false;
		} else if (diff > 0) {
			playerAcceleration = playerAcceleration + delta;
			playerBottom = playerBottom - (delta * playerAcceleration);
			if (playerBottom - target < 3) {
				playerBottom = target;
				playerOnFloor = true;
				playerDblJump = false;
			}
		} else {
			// GAME OVER
			gameOver = true;
			score = Math.floor(score);
			ga('send', 'event', 'score', 'session', 'Score', score);
			if (score > topScore) {
				topScore = score;
				document.getElementById("topscore").innerHTML = "Top score: " + topScore;
				ga('send', 'event', 'score', 'top', 'Top score', topScore);
			}
			dino.style.transform = "scale(1)";
			document.getElementById("gameover").style.display = "block";
			document.body.classList.add("gameover");
			document.getElementById("twitter").href = "https://twitter.com/home?status=Just%20scored%20" +
				score + "%20on%20Gwoek!%20http://bbaliguet.github.io/Gwoek/";
			return;
		}
		var scale = playerOnFloor ? 1 : 1 + 1 / (Math.abs(playerAcceleration / 20) + 1);
		dino.style.bottom = playerBottom + "px";
		dino.style.transform = "scale(" + scale + ")";

		// adjust score
		score = score + delta;
		if (score % 100 === 0) {
			noVaryBase = noVaryBase * 0.8;
			withVariationBase += 0.05;
		}

		// adjust sprite
		if (score % 14 < 7) {
			dino.style.backgroundPosition = "-14px 0px";
		} else {
			dino.style.backgroundPosition = "0px 0px";
		}
		document.getElementById("score").innerHTML = "score: " + Math.floor(score);

		requestAnimationFrame(loop);
	},

	updateClock = function () {
		var previous = now;

		if (now) {
			now = Date.now();
			delta = (now - previous) / (1000 / 60);
		} else {
			now = Date.now();
			delta = 1;
		}
	},

	init = function () {
		var player = document.getElementById("player");
		document.body.classList.remove("gameover");
		document.getElementById("gameover").style.display = "none";
		document.getElementById("splash").style.display = "none";
		document.getElementById("dino").style.display = "block";
		viewport = document.body.getBoundingClientRect();
		// init ground
		nbTiles = Math.floor(viewport.width / 20) + 2;
		player.innerHTML = "";
		ground.splice(0, ground.length);
		for (var i = 0; i < nbTiles; i++) {
			var tile = document.createElement("div");
			ground.push({
				height: 100,
				tile: tile
			});
			tile.classList.add("ground");
			player.appendChild(tile);
		}
		// init clouds
		clouds.splice(0, clouds.length);
		// init player
		playerDblJump = false;
		playerAcceleration = 0;
		playerBottom = 100;
		playerOnFloor = true;
		score = 0;
		noVaryBase = 10;
		withVariationBase = 0.1;

		// init clock
		now = 0;
		delta = 1;
	};

// event listener
var onAction = function () {
	if (gameOver) {
		init();
		requestAnimationFrame(loop);
		gameOver = false;
		return;
	}
	if (!playerOnFloor && playerDblJump || gameOver) {
		return;
	}
	if (playerOnFloor) {
		playerOnFloor = false;
		playerAcceleration = -20;
		playerBottom += 10;
	} else {
		playerDblJump = true;
		playerAcceleration = -15;
		if (darkColor || Math.random() < 0.5) {
			darkColor = !darkColor;
			if (darkColor) {
				document.body.classList.add("dark");
			} else {
				document.body.classList.remove("dark");
			}
		}
	}
	// generate a random color
	var color = Math.floor(Math.random() * 360),
		light = darkColor ? "7%" : "80%";
	document.getElementById("player").style.backgroundColor = "hsl(" + color + ", 100%, " + light + ")";
};

document.addEventListener("keydown", onAction);
document.addEventListener("touchstart", function (e) {
	e.preventDefault();
	onAction();
});
// update on resize
window.addEventListener("resize", function () {
	init();
});
