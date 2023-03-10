import { $, setVisible, compressActions, parseActions } from './src/helper.js';
import { Stage, Player } from './src/stage.js';
import { Viewport } from './src/types.js';
import render from './src/renderer.js';

/*
 *
 *
 *
 * DOM ELEMENTS
 *
 *
 *
 */

const _scoreEl = $('#score');
const _topScoreEl = $('#topscore');
const _twitterEl = $('#twitter') as HTMLAnchorElement;
const _gameOverEl = $('#gameover');
const _splashEl = $('#splash');
const _lvlUpEl = $('#lvlUp');
const _highscoresShow = $('#highscoresShow');

// canvas
const _canvasEl = $('#canvas') as HTMLCanvasElement;

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
let withSplash = true;
let topScore = 0;
let stage: Stage;
let viewport: Viewport;
let seed = 0;

const twitterMsg = 'Just scored {score} on @GwoekGame! Challenge me now: https://bbaliguet.github.io/Gwoek#{seed}_{score}_{actions} #Gwoek';

// highscores
const highscores = {};
interface Score {
	external: boolean;
	actions: Array<number>;
	score: number;
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

function showGameOver(score: number): void {
	if (score > topScore) {
		topScore = score;
		_topScoreEl.innerHTML = 'Top score: ' + topScore;
	}

	const actions = stage.game.actions;

	// save to highscores
	if (!highscores[seed]) {
		highscores[seed] = [];
	}

	const seedHighScores = highscores[seed];

	// push new score
	seedHighScores.push({
		actions, score, external: false
	});

	seedHighScores.sort((a: Score, b: Score) => (a.external ? 1 : b.external ? -1 : b.score - a.score));
	if (seedHighScores.length > 6) {
		seedHighScores.length = 6;
	}

	setVisible(_gameOverEl, true);
	_lvlUpEl.classList.remove('show');
	document.body.classList.add('gameover');
	_twitterEl.href = 'https://twitter.com/intent/tweet?text=' +
		encodeURIComponent(twitterMsg
			.replace(/\{score\}/g, String(score))
			.replace(/\{seed\}/g, String(seed))
			.replace(/\{actions\}/g, compressActions(actions))
		);
}

function loop(): void {
	const clock = stage.clock;
	const game = stage.game;
	const chunk = 10;

	let total = clock.total();
	let dif = clock.tick(chunk);

	const updateGhost = function(player: Player): void {
		if (!player.ghost) {
			return;
		}
		if (player.actions.indexOf(total) != -1) {
			player.action = true;
		}
	};

	if (dif > 2000) {
		game.gameOver = true;
	}

	// update the environment
	do {
		if (dif) {
			if (!game.gameOver) {
				total += chunk;
				game.total = total;

				// update ghosts
				stage.players.forEach(updateGhost);

				stage.update(chunk, viewport);

				// lvl up ?
				if (total > game.nextLevel) {
					game.levelUp();
				}
			}

			if (game.gameOver) {
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
	render(stage, {
		viewport,
		canvas: _canvasEl
	});

	if (game.lvlUp) {
		game.lvlUp = false;
		_lvlUpEl.classList.add('show');
		setTimeout(function() {
			_lvlUpEl.classList.remove('show');
		}, 1500);
	}

	if (game.changeColor) {
		game.changeColor = false;
		stage.colorize();
	}

	_scoreEl.innerHTML = 'score: ' + Math.floor(total);

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

function init(): void {
	document.body.classList.remove('gameover');
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

	// init rand method. Use seed if provided
	const [hashSeed, hashScore, hashActions] = window.location.hash.substr(1).split('_');
	const hash = parseInt(hashSeed, 10);
	seed = isNaN(hash) ? Math.floor(Math.random() * 100000000) : hash;
	const actions = parseActions(hashActions || '');
	if (actions && actions.length) {
		highscores[seed] = [{
			actions, score: parseInt(hashScore, 10), external: true
		}]
	}
	console.log('Gwoek playing with seed ' + seed);

	if (isNaN(hash)) {
		window.location.hash = '#' + seed;
	}

	stage = new Stage(viewport, seed);

	// insert ghost
	if (highscores[seed]) {
		highscores[seed].forEach((score: Score) => {
			const player = new Player();
			player.actions = score.actions;
			player.ghost = true;
			stage.players.push(player);
		});
	}

	// init canvas
	_canvasEl.width = viewport.width;
	_canvasEl.height = viewport.height;

	loop();
}

function showHighScores(): void {
	const trackHighscores = highscores[seed] || [];
	trackHighscores.forEach(function(result, index) {
			const line = $(`#trackscores tr:nth-child(${index + 1})`);
			if (!line) {
				return;
			}
			line.innerHTML = `<td class="${result.external ? 'external' : ''}">${result.score}</td>`;
		});
	setVisible(_gameOverEl, false);
	setVisible(_highscoresShow, true);
}

function hideHighScores(): void {
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

function onAction(): void {
	if (!stage || stage.game.gameOver) {
		if (withSplash) {
			withSplash = false;
			init();
		}
		return;
	}

	const player = stage.players[0];
	player.action = true;
}

function bindAction(element, listener): void {
	const wrapper = function(event): void {
		event.preventDefault();
		listener();
	};
	element.addEventListener('click', wrapper);
	element.addEventListener('touchstart', wrapper);
}

document.addEventListener('DOMContentLoaded', function() {
	// event listeners
	document.addEventListener('keydown', onAction);
	document.addEventListener('touchstart', function(e) {
		e.preventDefault();
		onAction();
	});

	// update on resize
	window.addEventListener('resize', function() {
		if (!withSplash) {
			init();
		}
	});

	// retry and try new
	function onRetry(): void {
		init();
	}

	function onTryNew(): void {
		window.location.hash = '';
		init();
	}

	bindAction($('#retry'), onRetry);
	bindAction($('#trynew'), onTryNew);
	bindAction($('#highscores'), showHighScores);
	bindAction($('#highscoresShow'), hideHighScores);
});
