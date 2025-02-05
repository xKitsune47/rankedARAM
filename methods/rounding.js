// rounding points to xx.xx format
function roundObject(value) {
    return Math.round(Object.values(value).reduce((sum, val) => sum + val, 0));
}

module.exports = { roundObject };
