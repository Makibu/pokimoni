const numberFormat = new Intl.NumberFormat("pl-PL");

export function formatNumber(value: number): string {
    return numberFormat.format(value);
}

/** Picks the Polish plural form: 1 moneta, 2 monety, 5 monet, 22 monety, 12 monet. */
export function polishPlural(count: number, one: string, few: string, many: string): string {
    if (count === 1) return one;
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    const isFew = lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14);
    return isFew ? few : many;
}

/** "Odebrano 1 monetę", "zarabiają 22 monety", "Odebrano 5 monet". */
export function coinsAccusative(count: number): string {
    return `${formatNumber(count)} ${polishPlural(count, "monetę", "monety", "monet")}`;
}

export function cardsCount(count: number): string {
    return `${formatNumber(count)} ${polishPlural(count, "karta", "karty", "kart")}`;
}
