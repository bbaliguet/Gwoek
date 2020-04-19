export interface Viewport {
    height: number;
    width: number;
}

export interface GameDOM {
    canvas: HTMLCanvasElement;
    viewport: Viewport;
}