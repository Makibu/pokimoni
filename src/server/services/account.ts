import {eq, sql} from "drizzle-orm";
import {STARTING_COINS} from "@/domain/economy";
import type {Account, LoginInput, RegisterInput, UpdateAccountInput} from "@/lib/validation/account";
import {hashPassword, verifyAgainstDummy, verifyPassword} from "@/server/auth/password";
import {clearAttempts, isRateLimited, LIMITS, recordAttempt} from "@/server/auth/rate-limit";
import {violatedUniqueConstraint} from "@/server/db/errors";
import {coinLedger, playerState, users} from "@/server/db/schema";
import type {Db} from "@/server/db/types";
import {AppError} from "@/server/http/errors";

type UserRow = typeof users.$inferSelect;

/** An account together with the version that a session token for it must carry. */
export type AccountSession = {account: Account; tokenVersion: number};

function toSession(user: UserRow): AccountSession {
    return {
        account: {id: user.id, username: user.username, email: user.email, avatar: user.avatar},
        tokenVersion: user.tokenVersion,
    };
}

const tooManyAttempts = () =>
    new AppError(429, "too_many_attempts", "Zbyt wiele prób. Spróbuj ponownie za kilka minut");
const invalidCredentials = () => new AppError(401, "invalid_credentials", "Nieprawidłowy email lub hasło");
const wrongPassword = () => new AppError(403, "wrong_password", "Nieprawidłowe hasło");

function duplicateError(constraint: string): AppError {
    return constraint.includes("email")
        ? new AppError(409, "email_taken", "Ten adres email jest już zajęty")
        : new AppError(409, "username_taken", "Ten nick jest już zajęty");
}

export async function registerAccount(db: Db, input: RegisterInput, ip: string): Promise<AccountSession> {
    const ipKey = `register:ip:${ip}`;
    if (await isRateLimited(db, ipKey, LIMITS.registerPerIp)) throw tooManyAttempts();
    await recordAttempt(db, ipKey);

    const passwordHash = await hashPassword(input.password);
    try {
        const user = await db.transaction(async (tx) => {
            const [created] = await tx
                .insert(users)
                .values({username: input.username, email: input.email, passwordHash})
                .returning();
            await tx.insert(playerState).values({userId: created.id, coins: STARTING_COINS});
            await tx.insert(coinLedger).values({userId: created.id, amount: STARTING_COINS, reason: "starting_bonus"});
            return created;
        });
        return toSession(user);
    } catch (error) {
        const constraint = violatedUniqueConstraint(error);
        if (constraint !== null) throw duplicateError(constraint);
        throw error;
    }
}

export async function loginAccount(db: Db, input: LoginInput, ip: string): Promise<AccountSession> {
    const emailKey = `login:email:${input.email.trim().toLowerCase()}`;
    const ipKey = `login:ip:${ip}`;
    if (
        (await isRateLimited(db, emailKey, LIMITS.loginPerEmail)) ||
        (await isRateLimited(db, ipKey, LIMITS.loginPerIp))
    ) {
        throw tooManyAttempts();
    }

    const [user] = await db.select().from(users).where(eq(users.emailKey, input.email.trim().toLowerCase()));

    let valid = false;
    if (user) valid = await verifyPassword(input.password, user.passwordHash);
    else await verifyAgainstDummy(input.password);

    if (!valid) {
        await recordAttempt(db, emailKey);
        await recordAttempt(db, ipKey);
        throw invalidCredentials();
    }

    await clearAttempts(db, emailKey);
    return toSession(user);
}

export async function getSessionUser(db: Db, userId: string, tokenVersion: number): Promise<Account | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.tokenVersion !== tokenVersion) return null;
    return toSession(user).account;
}

/** Applies profile changes. Changing the email or password requires the current password. */
export async function updateAccount(db: Db, userId: string, input: UpdateAccountInput): Promise<AccountSession> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new AppError(404, "not_found", "Nie znaleziono konta");

    const emailChanges = input.email !== undefined && input.email.toLowerCase() !== user.email.toLowerCase();
    const passwordChanges = input.newPassword !== undefined;

    if (emailChanges || passwordChanges) {
        if (!input.currentPassword) {
            throw new AppError(400, "current_password_required", "Podaj obecne hasło, aby zmienić email lub hasło");
        }
        if (!(await verifyPassword(input.currentPassword, user.passwordHash))) throw wrongPassword();
    }

    const changes: Partial<typeof users.$inferInsert> = {};
    if (input.username !== undefined) changes.username = input.username;
    if (input.avatar !== undefined) changes.avatar = input.avatar;
    if (input.email !== undefined) changes.email = input.email;
    if (input.newPassword !== undefined) changes.passwordHash = await hashPassword(input.newPassword);

    if (Object.keys(changes).length === 0) return toSession(user);

    try {
        const [updated] = await db
            .update(users)
            .set({
                ...changes,
                // Signs out every other session after a password change.
                ...(passwordChanges ? {tokenVersion: sql`${users.tokenVersion} + 1`} : {}),
            })
            .where(eq(users.id, userId))
            .returning();
        return toSession(updated);
    } catch (error) {
        const constraint = violatedUniqueConstraint(error);
        if (constraint !== null) throw duplicateError(constraint);
        throw error;
    }
}

/** Deletes the account; foreign keys remove all player data, which also releases cards in open trades. */
export async function deleteAccount(db: Db, userId: string, password: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new AppError(404, "not_found", "Nie znaleziono konta");
    if (!(await verifyPassword(password, user.passwordHash))) throw wrongPassword();
    await db.delete(users).where(eq(users.id, userId));
}
