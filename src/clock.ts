export default class Clock {
    now: number;
    start: number;
    
    constructor() {
        this.now = Date.now();
        this.start = this.now;
    }

    tick(chunk: number): number {

        const now = Date.now();
        let dif = now - this.now;
        dif = dif - dif % chunk;
        this.now = this.now + dif;
        return dif;
    }

    total(): number {
        return this.now - this.start;
    }

}