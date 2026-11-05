import {sql} from "drizzle-orm";
import {
    bigint,
    boolean,
    check,
    date,
    foreignKey,
    index,
    integer,
    jsonb,
    pgSchema,
    primaryKey,
    smallint,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";
import {RARITIES} from "@/domain/rarity";

/**
 * All application tables live in the `game` schema. It is not exposed through the Supabase REST API,
 * and every table additionally has RLS enabled without policies, so only the server connection
 * (table owner) can read or write data.
 */
export const game = pgSchema("game");

const createdAt = () => timestamp("created_at", {withTimezone: true}).notNull().defaultNow();
const userRef = (name: string) =>
    uuid(name)
        .notNull()
        .references(() => users.id, {onDelete: "cascade"});

// ---------- Enums ----------

export const rarityEnum = game.enum("rarity", RARITIES);
export const achievementRarityEnum = game.enum("achievement_rarity", ["common", "rare", "epic"]);
export const coinReasonEnum = game.enum("coin_reason", [
    "starting_bonus",
    "daily_reward",
    "quest",
    "minigame",
    "achievement",
    "piggy_bank",
    "pack_purchase",
]);
export const packSourceEnum = game.enum("pack_source", ["shop", "daily_pack", "voucher"]);
export const minigameEnum = game.enum("minigame", ["who_is_it", "memory", "sliding_puzzle"]);
export const difficultyEnum = game.enum("difficulty", ["easy", "medium", "hard"]);
export const minigameStatusEnum = game.enum("minigame_status", ["in_progress", "won", "lost"]);
export const requestStatusEnum = game.enum("request_status", ["pending", "accepted", "rejected", "cancelled"]);
export const profileStatEnum = game.enum("profile_stat", [
    "unique_cards",
    "collection_percent",
    "packs_opened",
    "achievements",
    "badges",
    "completed_sets",
    "rarest_card",
    "favorite_set",
    "trades",
    "income_per_hour",
    "days_in_game",
]);
export const notificationTypeEnum = game.enum("notification_type", [
    "friend_request",
    "friend_accepted",
    "friend_removed",
    "trade_offer",
    "trade_accepted",
    "trade_rejected",
    "trade_cancelled",
]);

// ---------- Accounts ----------

export const users = game
    .table(
        "users",
        {
            id: uuid("id").primaryKey().defaultRandom(),
            username: text("username").notNull(),
            usernameKey: text("username_key")
                .notNull()
                .generatedAlwaysAs(sql`lower(username)`),
            email: text("email").notNull(),
            emailKey: text("email_key")
                .notNull()
                .generatedAlwaysAs(sql`lower(email)`),
            passwordHash: text("password_hash").notNull(),
            avatar: smallint("avatar"),
            tokenVersion: integer("token_version").notNull().default(0),
            createdAt: createdAt(),
        },
        (t) => [
            uniqueIndex("users_username_key_idx").on(t.usernameKey),
            uniqueIndex("users_email_key_idx").on(t.emailKey),
            check("users_username_format", sql`${t.username} ~ '^[A-Za-z0-9_]{3,20}$'`),
            check("users_avatar_range", sql`${t.avatar} between 1 and 7`),
        ],
    )
    .enableRLS();

export const authAttempts = game
    .table("auth_attempts", {
        key: text("key").primaryKey(),
        windowStart: timestamp("window_start", {withTimezone: true}).notNull(),
        count: integer("count").notNull(),
    })
    .enableRLS();

// ---------- Catalog ----------

export type SetImages = {logo: string; symbol: string};
export type CardImages = {small: string; large: string};

export const sets = game
    .table(
        "sets",
        {
            id: text("id").primaryKey(),
            name: text("name").notNull(),
            series: text("series").notNull(),
            tier: smallint("tier").notNull(),
            total: integer("total").notNull(),
            printedTotal: integer("printed_total"),
            releaseDate: date("release_date"),
            images: jsonb("images").$type<SetImages>().notNull(),
        },
        (t) => [check("sets_tier_range", sql`${t.tier} between 1 and 3`)],
    )
    .enableRLS();

export const cards = game
    .table(
        "cards",
        {
            id: text("id").primaryKey(),
            setId: text("set_id")
                .notNull()
                .references(() => sets.id),
            name: text("name").notNull(),
            rarity: rarityEnum("rarity").notNull(),
            income: integer("income").notNull(),
            images: jsonb("images").$type<CardImages>().notNull(),
            subtypes: jsonb("subtypes").$type<string[]>(),
        },
        (t) => [index("cards_set_id_idx").on(t.setId), check("cards_income_positive", sql`${t.income} > 0`)],
    )
    .enableRLS();

export const achievements = game
    .table(
        "achievements",
        {
            id: integer("id").primaryKey(),
            title: text("title").notNull(),
            description: text("description").notNull(),
            rarity: achievementRarityEnum("rarity").notNull(),
            type: text("type").notNull(),
            amount: integer("amount").notNull(),
            rewardCoins: integer("reward_coins"),
            rewardPackTier: smallint("reward_pack_tier"),
            rewardPackQuantity: smallint("reward_pack_quantity"),
        },
        (t) => [
            check(
                "achievements_single_reward",
                sql`(${t.rewardCoins} is not null and ${t.rewardPackTier} is null and ${t.rewardPackQuantity} is null)
                 or (${t.rewardCoins} is null and ${t.rewardPackTier} between 1 and 3 and ${t.rewardPackQuantity} > 0)`,
            ),
        ],
    )
    .enableRLS();

export const badges = game
    .table("badges", {
        id: integer("id").primaryKey(),
        name: text("name").notNull().unique(),
        description: text("description").notNull(),
        category: text("category").notNull(),
        unit: text("unit").notNull(),
        amount: integer("amount"),
        icon: text("icon").notNull(),
    })
    .enableRLS();

// ---------- Player state and collection ----------

export const userCards = game
    .table(
        "user_cards",
        {
            userId: userRef("user_id"),
            cardId: text("card_id")
                .notNull()
                .references(() => cards.id),
            quantity: smallint("quantity").notNull(),
            firstAcquiredAt: timestamp("first_acquired_at", {withTimezone: true}).notNull().defaultNow(),
        },
        (t) => [
            primaryKey({columns: [t.userId, t.cardId]}),
            check("user_cards_quantity_range", sql`${t.quantity} between 1 and 9`),
        ],
    )
    .enableRLS();

export const playerState = game
    .table(
        "player_state",
        {
            userId: uuid("user_id")
                .primaryKey()
                .references(() => users.id, {onDelete: "cascade"}),
            coins: integer("coins").notNull(),
            slot1CardId: text("slot_1_card_id"),
            slot2CardId: text("slot_2_card_id"),
            piggyLastCollectedAt: timestamp("piggy_last_collected_at", {withTimezone: true}).notNull().defaultNow(),
            streakDay: smallint("streak_day").notNull().default(0),
            lastDailyClaimDay: date("last_daily_claim_day"),
        },
        (t) => [
            check("player_state_coins_non_negative", sql`${t.coins} >= 0`),
            check("player_state_streak_range", sql`${t.streakDay} between 0 and 7`),
            // A slotted card must be owned by the same player.
            foreignKey({
                name: "player_state_slot_1_owned_fk",
                columns: [t.userId, t.slot1CardId],
                foreignColumns: [userCards.userId, userCards.cardId],
            }),
            foreignKey({
                name: "player_state_slot_2_owned_fk",
                columns: [t.userId, t.slot2CardId],
                foreignColumns: [userCards.userId, userCards.cardId],
            }),
        ],
    )
    .enableRLS();

export const coinLedger = game
    .table(
        "coin_ledger",
        {
            id: bigint("id", {mode: "number"}).primaryKey().generatedAlwaysAsIdentity(),
            userId: userRef("user_id"),
            amount: integer("amount").notNull(),
            reason: coinReasonEnum("reason").notNull(),
            refId: text("ref_id"),
            createdAt: createdAt(),
        },
        (t) => [
            index("coin_ledger_user_idx").on(t.userId, t.createdAt),
            check("coin_ledger_amount", sql`${t.amount} <> 0`),
        ],
    )
    .enableRLS();

export type PackOpeningCard = {cardId: string; isNew: boolean; overLimit: boolean};

export const packOpenings = game
    .table(
        "pack_openings",
        {
            id: bigint("id", {mode: "number"}).primaryKey().generatedAlwaysAsIdentity(),
            userId: userRef("user_id"),
            setId: text("set_id")
                .notNull()
                .references(() => sets.id),
            source: packSourceEnum("source").notNull(),
            price: integer("price").notNull(),
            cards: jsonb("cards").$type<PackOpeningCard[]>().notNull(),
            isGodPack: boolean("is_god_pack").notNull(),
            createdAt: createdAt(),
        },
        (t) => [
            index("pack_openings_user_idx").on(t.userId, t.createdAt),
            check("pack_openings_price", sql`${t.price} >= 0`),
        ],
    )
    .enableRLS();

export const packVouchers = game
    .table(
        "pack_vouchers",
        {
            userId: userRef("user_id"),
            tier: smallint("tier").notNull(),
            quantity: integer("quantity").notNull(),
        },
        (t) => [
            primaryKey({columns: [t.userId, t.tier]}),
            check("pack_vouchers_tier_range", sql`${t.tier} between 1 and 3`),
            check("pack_vouchers_quantity", sql`${t.quantity} >= 0`),
        ],
    )
    .enableRLS();

export const dailyPack = game
    .table("daily_pack", {
        gameDay: date("game_day").primaryKey(),
        setId: text("set_id")
            .notNull()
            .references(() => sets.id),
    })
    .enableRLS();

export const userAchievements = game
    .table(
        "user_achievements",
        {
            userId: userRef("user_id"),
            achievementId: integer("achievement_id")
                .notNull()
                .references(() => achievements.id),
            unlockedAt: timestamp("unlocked_at", {withTimezone: true}).notNull().defaultNow(),
            claimedAt: timestamp("claimed_at", {withTimezone: true}),
        },
        (t) => [primaryKey({columns: [t.userId, t.achievementId]})],
    )
    .enableRLS();

export const userBadges = game
    .table(
        "user_badges",
        {
            userId: userRef("user_id"),
            badgeId: integer("badge_id")
                .notNull()
                .references(() => badges.id),
            acquiredAt: timestamp("acquired_at", {withTimezone: true}).notNull().defaultNow(),
        },
        (t) => [primaryKey({columns: [t.userId, t.badgeId]})],
    )
    .enableRLS();

// ---------- Daily activities ----------

export const dailyQuests = game
    .table(
        "daily_quests",
        {
            userId: userRef("user_id"),
            gameDay: date("game_day").notNull(),
            slot: smallint("slot").notNull(),
            questType: text("quest_type").notNull(),
            target: integer("target").notNull(),
            progress: integer("progress").notNull().default(0),
            claimedAt: timestamp("claimed_at", {withTimezone: true}),
        },
        (t) => [
            primaryKey({columns: [t.userId, t.gameDay, t.slot]}),
            check("daily_quests_slot_range", sql`${t.slot} between 1 and 3`),
            check("daily_quests_progress", sql`${t.progress} between 0 and ${t.target}`),
        ],
    )
    .enableRLS();

export const minigameDays = game
    .table("minigame_days", {
        gameDay: date("game_day").primaryKey(),
        game: minigameEnum("game").notNull(),
        difficulty: difficultyEnum("difficulty").notNull(),
        // Empty: the day only sets the variant, and every player gets their own cards.
        payload: jsonb("payload").notNull(),
    })
    .enableRLS();

export const minigameAttempts = game
    .table(
        "minigame_attempts",
        {
            userId: userRef("user_id"),
            gameDay: date("game_day")
                .notNull()
                .references(() => minigameDays.gameDay),
            state: jsonb("state").notNull(),
            status: minigameStatusEnum("status").notNull().default("in_progress"),
            reward: integer("reward"),
            startedAt: timestamp("started_at", {withTimezone: true}).notNull().defaultNow(),
            finishedAt: timestamp("finished_at", {withTimezone: true}),
        },
        (t) => [primaryKey({columns: [t.userId, t.gameDay]})],
    )
    .enableRLS();

// ---------- Social ----------

export const friendRequests = game
    .table(
        "friend_requests",
        {
            id: bigint("id", {mode: "number"}).primaryKey().generatedAlwaysAsIdentity(),
            fromUserId: userRef("from_user_id"),
            toUserId: userRef("to_user_id"),
            status: requestStatusEnum("status").notNull().default("pending"),
            createdAt: createdAt(),
            resolvedAt: timestamp("resolved_at", {withTimezone: true}),
        },
        (t) => [
            check("friend_requests_not_self", sql`${t.fromUserId} <> ${t.toUserId}`),
            // At most one pending request per pair of players, in either direction.
            uniqueIndex("friend_requests_one_pending_per_pair")
                .on(sql`least(${t.fromUserId}, ${t.toUserId})`, sql`greatest(${t.fromUserId}, ${t.toUserId})`)
                .where(sql`${t.status} = 'pending'`),
            index("friend_requests_to_user_idx").on(t.toUserId),
        ],
    )
    .enableRLS();

export const friendships = game
    .table(
        "friendships",
        {
            userA: userRef("user_a"),
            userB: userRef("user_b"),
            createdAt: createdAt(),
        },
        (t) => [
            primaryKey({columns: [t.userA, t.userB]}),
            check("friendships_ordered_pair", sql`${t.userA} < ${t.userB}`),
            index("friendships_user_b_idx").on(t.userB),
        ],
    )
    .enableRLS();

export const trades = game
    .table(
        "trades",
        {
            id: bigint("id", {mode: "number"}).primaryKey().generatedAlwaysAsIdentity(),
            fromUserId: userRef("from_user_id"),
            toUserId: userRef("to_user_id"),
            // Escrow (the offered copy stays owned while pending) is enforced by the trade service: a
            // composite FK to user_cards would also pin resolved trades and block later card moves.
            offeredCardId: text("offered_card_id")
                .notNull()
                .references(() => cards.id),
            requestedCardId: text("requested_card_id")
                .notNull()
                .references(() => cards.id),
            status: requestStatusEnum("status").notNull().default("pending"),
            createdAt: createdAt(),
            resolvedAt: timestamp("resolved_at", {withTimezone: true}),
        },
        (t) => [
            check("trades_not_self", sql`${t.fromUserId} <> ${t.toUserId}`),
            // One pending offer per direction: A→B and B→A are independent.
            uniqueIndex("trades_one_pending_per_direction")
                .on(t.fromUserId, t.toUserId)
                .where(sql`${t.status} = 'pending'`),
            index("trades_to_user_idx").on(t.toUserId),
        ],
    )
    .enableRLS();

export const showcase = game
    .table(
        "showcase",
        {
            userId: userRef("user_id"),
            position: smallint("position").notNull(),
            cardId: text("card_id").notNull(),
        },
        (t) => [
            primaryKey({columns: [t.userId, t.position]}),
            uniqueIndex("showcase_card_once_idx").on(t.userId, t.cardId),
            check("showcase_position_range", sql`${t.position} between 1 and 5`),
            foreignKey({
                name: "showcase_card_owned_fk",
                columns: [t.userId, t.cardId],
                foreignColumns: [userCards.userId, userCards.cardId],
            }),
        ],
    )
    .enableRLS();

export const profileStats = game
    .table(
        "profile_stats",
        {
            userId: userRef("user_id"),
            position: smallint("position").notNull(),
            stat: profileStatEnum("stat").notNull(),
        },
        (t) => [
            primaryKey({columns: [t.userId, t.position]}),
            uniqueIndex("profile_stats_stat_once_idx").on(t.userId, t.stat),
            check("profile_stats_position_range", sql`${t.position} between 1 and 3`),
        ],
    )
    .enableRLS();

export const notifications = game
    .table(
        "notifications",
        {
            id: bigint("id", {mode: "number"}).primaryKey().generatedAlwaysAsIdentity(),
            userId: userRef("user_id"),
            type: notificationTypeEnum("type").notNull(),
            payload: jsonb("payload").notNull(),
            createdAt: createdAt(),
            readAt: timestamp("read_at", {withTimezone: true}),
        },
        (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
    )
    .enableRLS();

export const feedback = game
    .table(
        "feedback",
        {
            id: bigint("id", {mode: "number"}).primaryKey().generatedAlwaysAsIdentity(),
            userId: userRef("user_id"),
            description: text("description").notNull(),
            createdAt: createdAt(),
        },
        (t) => [check("feedback_description_length", sql`char_length(${t.description}) between 1 and 2000`)],
    )
    .enableRLS();
