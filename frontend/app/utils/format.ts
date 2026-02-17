/**
 * Formats a number to a compact string representation (k, M, G).
 * @param num - The number to format
 * @returns The formatted string
 */
export function formatCompactNumber(num: number | string | undefined | null): string {
    const val = Number(num);
    if (!val || isNaN(val)) return "0";
    
    if (val >= 1000000000) {
        return (val / 1000000000).toFixed(1).replace('.0', '') + 'G';
    }
    if (val >= 1000000) {
        return (val / 1000000).toFixed(1).replace('.0', '') + 'M';
    }
    if (val >= 1000) {
        return (val / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return val.toString();
}
