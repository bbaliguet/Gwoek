import { bgBottomLimit, bgTopLimit, tileWidth } from './const.js';
function applyCellShadingStyle(context) {
    context.strokeStyle = 'rgba(255,255,255,1)';
    context.lineWidth = 8;
    context.shadowColor = 'rgba(0,0,0,0.5)';
    context.shadowBlur = 15;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 10;
}
function applyStandardStyle(context, light = false) {
    context.strokeStyle = light ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
    context.lineWidth = 2;
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 2;
}
function applyNoStyle(context) {
    context.lineWidth = 0;
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
}
function renderPrepare(context, viewport) {
    context.clearRect(0, 0, viewport.width, viewport.height);
}
function renderPlayerPath(context, viewport, player, ghost = false, onGround = false) {
    const onFloor = player.onFloor;
    const scale = onFloor ? 1 : 1 + 1 / (Math.abs(player.acceleration / 10) + 1);
    const xPos = player.left;
    const yPos = viewport.height - player.bottom + (!ghost ? 2 : 0);
    const size = ghost ? 12 : 16;
    const onGroundStickyness = onGround ? 3 : 0;
    if (onGround) {
        context.lineTo(xPos - onGroundStickyness, yPos);
    }
    else {
        context.moveTo(xPos, yPos);
    }
    if (player.darkCount > 0) {
        context.lineTo(xPos - size, yPos - size * scale);
        context.lineTo(xPos, yPos - size * 2);
        context.lineTo(xPos + size, yPos - size * scale);
    }
    else {
        context.lineTo(xPos - size, yPos - size - scale * size / 2);
        context.lineTo(xPos, yPos - size);
        context.lineTo(xPos + size, yPos - size - scale * size / 2);
    }
    context.lineTo(xPos + onGroundStickyness, yPos);
    return {
        xPos: xPos + onGroundStickyness,
        yPos: yPos
    };
}
function renderPlayer(context, viewport, stage, player, ghost = false) {
    const color = stage.groundColor;
    const dblJump = player.dblJump;
    context.beginPath();
    if (player.darkCount > 0) {
        applyStandardStyle(context, true);
        context.fillStyle = ghost ? 'rgba(0,0,0,0.1)' : color;
    }
    else {
        applyStandardStyle(context);
        context.fillStyle = ghost ? 'rgba(255,255,255,0.1)' : color;
    }
    const pos = renderPlayerPath(context, viewport, player, ghost);
    context.closePath();
    context.fill();
    if (!ghost) {
        context.stroke();
    }
    if (dblJump) {
        applyNoStyle(context);
        const dif = (Date.now() - dblJump) / 10;
        if (!player.dblJumpX) {
            player.dblJumpX = pos.xPos;
            player.dblJumpY = pos.yPos - 15;
        }
        context.fillStyle = ghost ? 'transparent' : 'rgba(0,0,0,0.05)';
        context.strokeStyle = color;
        context.lineWidth = ghost ? 1 : 3;
        context.beginPath();
        context.arc(player.dblJumpX, player.dblJumpY, dif, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
    }
    else {
        player.dblJumpX = null;
        player.dblJumpY = null;
    }
}
function renderGround(context, viewport, stage, background = false) {
    const ground = stage.ground;
    const nbTiles = ground.length;
    const player = stage.players[0];
    const playerXPos = player.left;
    const playerBottom = player.bottom;
    const playerOnFloor = player.onFloor;
    let playerRendered = false;
    if (background) {
        applyCellShadingStyle(context);
    }
    else {
        context.fillStyle = stage.groundColor;
        applyNoStyle(context);
    }
    context.beginPath();
    context.moveTo(0, viewport.height);
    let lastGroundY = NaN;
    let lastGroundX = NaN;
    ground.forEach(function (item, index) {
        const xPos = item.left;
        let height = item.height;
        let skipScale = false;
        if (index > nbTiles * 4 / 5) {
            // progressive height, square fn
            const variation = (nbTiles - index) / nbTiles * 5;
            height = ((1 - (1 - variation) * (1 - variation)) / 2 + 1 / 2) * height;
            skipScale = true;
        }
        const yPos = viewport.height - height;
        if (yPos != lastGroundY || item.lvlUp) {
            if (!skipScale && !isNaN(lastGroundX) && !isNaN(lastGroundY)) {
                context.lineTo(lastGroundX, lastGroundY);
            }
            context.lineTo(xPos, yPos);
            lastGroundY = yPos;
        }
        lastGroundX = xPos;
        // lvl limit
        if (item.lvlUp) {
            context.lineTo(xPos - 10, yPos - 20);
            context.lineTo(xPos - 10, yPos - 40);
            context.lineTo(xPos + 10, yPos - 40);
            context.lineTo(xPos + 10, yPos - 20);
            context.lineTo(xPos, yPos);
        }
        // player on this ground
        if (!playerRendered && playerOnFloor) {
            if (playerXPos >= xPos && playerXPos - xPos < tileWidth && playerBottom <= height) {
                playerRendered = true;
                renderPlayerPath(context, viewport, player, false, true);
            }
        }
    });
    context.lineTo(viewport.width, viewport.height);
    if (background) {
        context.stroke();
    }
    else {
        context.fill();
    }
    if (!playerRendered) {
        renderPlayer(context, viewport, stage, player);
    }
}
function renderBackground(context, viewport, stage) {
    const background = stage.background;
    // create gradient
    const vHeight = viewport.height;
    const gradient = context.createLinearGradient(0, vHeight - bgBottomLimit, 0, vHeight - bgTopLimit);
    gradient.addColorStop(0, stage.backColor1);
    gradient.addColorStop(1, stage.backColor2);
    applyNoStyle(context);
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, viewport.height);
    background.forEach(function (point) {
        context.lineTo(point.left, viewport.height - point.bottom);
    });
    context.lineTo(viewport.width, viewport.height);
    context.fill();
}
export default function render(stage, dom) {
    const viewport = dom.viewport;
    const context = dom.canvas.getContext('2d');
    renderPrepare(context, viewport);
    renderBackground(context, viewport, stage);
    // drop shadow and cell shading
    renderGround(context, viewport, stage, true);
    // front rendering
    renderGround(context, viewport, stage);
    stage.players.forEach(function (player, index) {
        // render extra players
        if (index) {
            renderPlayer(context, viewport, stage, player, true);
        }
    });
}
//# sourceMappingURL=renderer.js.map