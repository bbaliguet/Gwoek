import {
    lvlupGap,
    tileWidth,
    topLimit,
    bottomLimit,
    backgroundSpeed,
    bgMiddle,
    bgJitter,
    baseSpeed,
    acceleration,
    darkCountLimit,
    darkCountReboot,
    noVaryVariation,
    nextGapTileVariation,
    speedVariation,
    variationVariation,
    colorTimeout
} from './const.js';

import { jitter } from './helper.js';
import Clock from './clock.js';
import { Viewport } from './types.js';

interface RandFunc {
    (): number;
}


export class Player {
    acceleration = 0;
    horizontalAcceleration = 0;

    onFloor = true;
    left = 120;
    bottom = 100;

    darkCount = 5;

    dblJump = 0;
    dblJumpX: number;
    dblJumpY: number;

    ghost = false;
    out = false;
    action = false;
    actions: Array<number>;

    handleAction(ghost: boolean): boolean {
        if (!this.action) {
            return false;
        }
        this.action = false;

        if (!this.onFloor && (this.dblJump && this.darkCount > 0)) {
            if (this.acceleration > 0) {
                this.acceleration = 0;
            }
        } else {
            if (this.onFloor) {
                this.onFloor = false;
                this.dblJump = 0;
                this.acceleration = -acceleration;
                this.bottom += 40;
            } else {
                this.dblJump = Date.now();
                this.acceleration = -acceleration * 3 / 4;
                this.darkCount--;
                if (this.darkCount < darkCountLimit) {
                    this.darkCount = darkCountReboot;
                }
            }
        }
        return !ghost;
    }

    update(dif: number, stage: Stage): void {
        if (this.out) {
            return;
        }

        const game = stage.game;
        const ground = stage.ground;

        // handle action
        if (this.handleAction(this.ghost)) {
            game.changeColor = true;
            game.actions.push(game.total);
        }

        // adjust player on its tile
        const playerTile = ground[Math.floor((this.left + 14) / tileWidth)];
        const target = playerTile ? playerTile.height : 0;
        const diff = this.bottom - target;
        const absoluteDiff = diff < 0 ? -diff : diff;

        let tileContact = false;

        if (playerTile && absoluteDiff < 10 && this.onFloor) {
            this.bottom = target;
            this.acceleration = 0;
        } else if (playerTile && diff > 0) {
            this.acceleration = this.acceleration + dif / 20;
            this.bottom = this.bottom - this.acceleration;
            if (this.bottom - target < 3) {
                this.bottom = target;
                this.onFloor = true;
                this.dblJump = 0;
            }
        } else {
            this.onFloor = true;
            this.dblJump = 0;
            tileContact = true;
            this.horizontalAcceleration = -baseSpeed * game.speed;
            if (!playerTile) {
                if (this.ghost) {
                    this.out = true;
                    return;
                }

                game.gameOver = true;
                return;
            }
            this.bottom = playerTile.height;
        }

        if (!tileContact) {
            // adjust player left
            this.horizontalAcceleration += dif / 3;

            if (this.horizontalAcceleration > 20) {
                this.horizontalAcceleration = 20;
            }

            this.left += this.horizontalAcceleration / 10;
            if (this.left > 120) {
                this.left = 120;
            }
        }
    }
}

export class BgPoint {
    left = 0;
    bottom = 0;
}

export class Point {
    xPos: number;
    yPos: number;
}

export class Tile {
    left: number;
    height: number;
    lvlUp = false
}

export class Game {
    total = 0;
    speed = 1.1;
    noVary = 200;
    noVaryBase = 10;
    lvlUp = false;
    lvlUpTile = false;
    changeColor = false;
    nextGapTileBase = 30;
    variationBase = 200;
    nextLevel = lvlupGap;
    actions = [];
    gameOver = false;

    rand: RandFunc;

    constructor(seed: number) {
        const generator = new window['MersenneTwister'](seed);
        this.rand = function (): number {
            return generator.random();
        };
    }


    levelUp(): void {
        this.lvlUp = true;
        this.nextLevel += lvlupGap;
        this.noVaryBase = this.noVaryBase * noVaryVariation;
        this.nextGapTileBase = this.nextGapTileBase * nextGapTileVariation;
        this.speed = this.speed * speedVariation;
        this.variationBase = this.variationBase * variationVariation;
        this.lvlUpTile = false;
    }
}

export class Stage {

    game: Game;
    clock: Clock;

    ground: Array<Tile>;
    background: Array<BgPoint>;
    players: Array<Player>;

    backColor1: string;
    backColor2: string;
    groundColor: string;
    colorHue: number;
    colorLight: string;
    darkColor: boolean;
    nextColor: number;

    constructor(viewport: Viewport, seed: number) {
        const ground = [];
        const nbTiles = Math.floor(viewport.width / tileWidth) + 3;
        for (let i = 0; i < nbTiles; i++) {
            const tile = new Tile();
            tile.height = 100;
            tile.left = i * tileWidth;
            ground.push(tile);
        }
        this.ground = ground;
        this.background = [];
        this.players = [
            new Player()
        ]
        this.game = new Game(seed);
        this.clock = new Clock();

        this.colorize();
    }

    update(dif: number, viewport: Viewport): void {
        this.updateGround(dif);
        this.updateBackground(dif, viewport);
        this.players.forEach(player => player.update(dif, this));
    }

    updateGround(dif: number): void {
        const ground = this.ground;
        const game = this.game
        const nbTiles = ground.length;


        // adjust ground left
        ground.forEach(function (item) {
            item.left -= dif * game.speed;
        });

        // filter out of view tiles
        const newGround = ground.filter(function (item) {
            return item.left > -tileWidth;
        });

        // insert new tiles
        while (newGround.length < nbTiles) {
            const lastTile = newGround[newGround.length - 1];
            const newTile = new Tile();
            newTile.left = lastTile.left + tileWidth;

            const withVariation = game.noVary < 0;
            const variation = withVariation ? game.variationBase : 0;
            let diff = variation ? -variation / 2 + game.rand() * variation : 0;

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
            newGround.push(newTile);
        }

        this.ground = newGround;
    }

    updateBackground(dif: number, viewport: Viewport): void {
        let outOfScreen = 0;
        const background = this.background;
        // update left and count out of screen
        background.forEach(function (point) {
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
            background.push(new BgPoint());
        }

        let nbPoints = background.length;
        let last = background[nbPoints - 1];

        while (last.left < viewport.width) {
            const lastBottom = last.bottom;
            const target = Math.floor(jitter(bgMiddle, bgJitter, function (x) {
                return x * x;
            }));
            const left = last.left + (lastBottom > target ? lastBottom - target : target - lastBottom);
            // remove unused points as it will be aligned
            const beforeLast = background[nbPoints - 2];
            if (beforeLast) {
                if ((beforeLast.bottom - lastBottom) * (lastBottom - target) > 0) {
                    background.pop();
                    nbPoints--;
                }
            }
            const newPoint = new BgPoint();
            newPoint.bottom = target;
            newPoint.left = left;
            background.push(newPoint);
            nbPoints++;
            last = background[nbPoints - 1];
        }
    }

    colorize(): void {
        const now = Date.now();
        const darkCount = this.players[0].darkCount;
        const darkColor = darkCount <= 0;
        if (this.darkColor == darkColor && now < this.nextColor) {
            return;
        }
        // generate a random color
        const color = Math.floor(Math.random() * 360);
        const light = darkColor ? '7%' : '80%';
        document.body.style.backgroundColor = 'hsl(' + color + ', 100%, ' + light + ')';
    
        this.colorHue = color;
        this.colorLight = light;
        this.darkColor = darkColor;
        this.nextColor = now+colorTimeout;
        
        this.groundColor = 'hsl(' + color + ',100%,' + (darkColor ? '5' : '70') + '%)';
        this.backColor1 = 'hsl(' + color + ',100%,' + (darkColor ? '7' : '80') + '%)';
        this.backColor2 = 'hsl(' + color + ',100%,' + (darkColor ? '27' : '60') + '%)';
    }
}
