export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
}

export const lerp = (value_1: number, value_2: number, alpha: number): number => {
    return value_1 * (1 - alpha) + value_2 * alpha;
}

export const randInRange = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min) + min);
}