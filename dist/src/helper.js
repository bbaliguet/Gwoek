export function $(selector) {
    return document.querySelector(selector);
}
export function setVisible(el, visible) {
    el.style.display = visible ? 'block' : 'none';
}
export function jitter(origin, value, randFn) {
    let rand = Math.random();
    if (randFn) {
        rand = randFn(rand);
    }
    return origin + value * rand - value / 2;
}
export function compressActions(actions) {
    let last = 0;
    const compressed = [];
    for (const ts of actions) {
        const dif = ts - last;
        last = ts;
        // dif should be max a few seconds, with chunck of 10 ms
        let strDif = (dif / 10).toString(36);
        // max length is 2 (diff of 12.9s), normalize to 2
        if (strDif.length === 1) {
            strDif = '0' + strDif;
        }
        compressed.push(strDif);
    }
    return compressed.join('');
}
export function parseActions(actions) {
    let last = 0;
    const parsed = [];
    for (let i = 0; i < actions.length; i += 2) {
        last += parseInt(actions.substring(i, 2), 36) * 10;
        parsed.push(last);
    }
    return parsed;
}
//# sourceMappingURL=helper.js.map