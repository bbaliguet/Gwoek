var ground = [],
	nbTiles = 100,
	tileWidth = 20,
	shift = 0,
	noVary = false,
	darkColor = true,

	playerDblJump = false,
	playerAcceleration = 0,
	playerBottom = 100,
	playerOnFloor = true,

	gameOver = true,

	now,
	delta,

	score = 0,
	topScore = 0,
	noVaryBase = 10,
	withVariationBase = 0.1,

	loop = function () {
		var swap = false;

		updateClock();

		if (shift >= tileWidth) {
			shift = 0;
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
				tile.style.height = item.height + "px";
			}
		});
		shift = shift + (10 * delta);

		// adjust player on 5th tile
		var playerTile = ground[5],
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
			if (score > topScore) {
				topScore = score;
				document.getElementById("topscore").innerHTML = "Top score: " + topScore;
			}
			dino.style.transform = "scale(1)";
			document.getElementById("gameover").style.display = "block";
			return;
		}
		var scale = playerOnFloor ? 1 : 1 + 1 / (Math.abs(playerAcceleration / 20) + 1);
		dino.style.bottom = playerBottom + "px";
		dino.style.transform = "scale(" + scale + ")";

		// adjust score
		score++;
		if (score % 100 === 0) {
			noVaryBase = noVaryBase * 0.8;
			withVariationBase += 0.05;
		}
		document.getElementById("score").innerHTML = "score: " + score;

		requestAnimationFrame(loop);
	},

	updateClock = function () {
		var previous = now;

		if (now) {
			now = window.performance.now();
			delta = (now - previous) / (1000 / 60);
		} else {
			now = window.performance.now();
			delta = 1;
		}
	},

	init = function () {
		var player = document.getElementById("player");
		document.getElementById("gameover").style.display = "none";
		document.getElementById("splash").style.display = "none";
		document.getElementById("dino").style.display = "block";
		// init ground
		nbTiles = Math.floor(document.body.getBoundingClientRect().width / 20) + 2;
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
		darkColor = !darkColor;
	}
	// generate a random color
	var color = Math.floor(Math.random() * 360),
		light = darkColor ? "80%" : "7%";
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
