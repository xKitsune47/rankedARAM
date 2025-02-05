// rounding points to xx.xx format
export default function roundObject(value) {
    return Math.round(Object.values(value).reduce((sum, val) => sum + val, 0));
}
