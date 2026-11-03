/** A game day as an ISO date (YYYY-MM-DD). It starts at 10:00 Polish time, not at midnight. */
export type GameDay = string;

export const GAME_DAY_TIME_ZONE = "Europe/Warsaw";
export const GAME_DAY_START_HOUR = 10;

const warsawClock = new Intl.DateTimeFormat("en-CA", {
    timeZone: GAME_DAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
});

/** Game day containing the given instant. Uses the Warsaw wall clock, so DST changes are handled. */
export function gameDayOf(instant: Date): GameDay {
    const parts = Object.fromEntries(warsawClock.formatToParts(instant).map((part) => [part.type, part.value]));
    const calendarDay = `${parts.year}-${parts.month}-${parts.day}`;
    return Number(parts.hour) < GAME_DAY_START_HOUR ? addDays(calendarDay, -1) : calendarDay;
}

export function addDays(day: GameDay, days: number): GameDay {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
