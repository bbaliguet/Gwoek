// environment and adjusted variables
export const tileWidth = 15;
export const lvlupGap = 10000;
export const acceleration = 15;
export const baseSpeed = 60;
export const colorTimeout = 500;
export const backgroundSpeed = 4;
export const darkCountReboot = 5;
export const darkCountLimit = -1;

// limits for random ground generation
export const topLimit = 300;
export const bottomLimit = 20;
export const bgTopLimit = 500;
export const bgBottomLimit = 100;
export const bgJitter = (bgTopLimit - bgBottomLimit) / 2;
export const bgMiddle = bgBottomLimit + bgJitter;

// game difficulty
export const noVaryVariation = 0.8;
export const nextGapTileVariation = 0.6;
export const speedVariation = 1.1;
export const variationVariation = 1.3;