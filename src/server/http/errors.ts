/** An expected failure with a message safe to show to the player. */
export class AppError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = "AppError";
    }
}
