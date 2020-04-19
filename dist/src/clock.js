export default class Clock {
    constructor() {
        this.now = Date.now();
        this.start = this.now;
    }
    tick(chunk) {
        const now = Date.now();
        let dif = now - this.now;
        dif = dif - dif % chunk;
        this.now = this.now + dif;
        return dif;
    }
    total() {
        return this.now - this.start;
    }
}
//# sourceMappingURL=clock.js.map