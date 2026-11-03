CREATE SCHEMA "game";
--> statement-breakpoint
CREATE TYPE "game"."achievement_rarity" AS ENUM('common', 'rare', 'epic');--> statement-breakpoint
CREATE TYPE "game"."coin_reason" AS ENUM('starting_bonus', 'daily_reward', 'quest', 'minigame', 'achievement', 'piggy_bank', 'pack_purchase');--> statement-breakpoint
CREATE TYPE "game"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "game"."minigame" AS ENUM('who_is_it', 'memory', 'sliding_puzzle');--> statement-breakpoint
CREATE TYPE "game"."minigame_status" AS ENUM('in_progress', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "game"."notification_type" AS ENUM('friend_request', 'friend_accepted', 'friend_removed', 'trade_offer', 'trade_accepted', 'trade_rejected', 'trade_cancelled');--> statement-breakpoint
CREATE TYPE "game"."pack_source" AS ENUM('shop', 'daily_pack', 'voucher');--> statement-breakpoint
CREATE TYPE "game"."profile_stat" AS ENUM('unique_cards', 'collection_percent', 'packs_opened', 'achievements', 'badges', 'completed_sets', 'rarest_card', 'favorite_set', 'trades', 'income_per_hour', 'days_in_game');--> statement-breakpoint
CREATE TYPE "game"."rarity" AS ENUM('common', 'uncommon', 'rare', 'double rare', 'ultra rare', 'ace spec rare', 'illustration rare', 'special illustration rare', 'hyper rare', 'secret rare');--> statement-breakpoint
CREATE TYPE "game"."request_status" AS ENUM('pending', 'accepted', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "game"."achievements" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"rarity" "game"."achievement_rarity" NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"reward_coins" integer,
	"reward_pack_tier" smallint,
	"reward_pack_quantity" smallint,
	CONSTRAINT "achievements_single_reward" CHECK (("game"."achievements"."reward_coins" is not null and "game"."achievements"."reward_pack_tier" is null and "game"."achievements"."reward_pack_quantity" is null)
                 or ("game"."achievements"."reward_coins" is null and "game"."achievements"."reward_pack_tier" between 1 and 3 and "game"."achievements"."reward_pack_quantity" > 0))
);
--> statement-breakpoint
ALTER TABLE "game"."achievements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."auth_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game"."auth_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."badges" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"amount" integer,
	"icon" text NOT NULL,
	CONSTRAINT "badges_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "game"."badges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."cards" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"name" text NOT NULL,
	"rarity" "game"."rarity" NOT NULL,
	"income" integer NOT NULL,
	"images" jsonb NOT NULL,
	"subtypes" jsonb,
	CONSTRAINT "cards_income_positive" CHECK ("game"."cards"."income" > 0)
);
--> statement-breakpoint
ALTER TABLE "game"."cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."coin_ledger" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game"."coin_ledger_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" "game"."coin_reason" NOT NULL,
	"ref_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coin_ledger_amount" CHECK ("game"."coin_ledger"."amount" <> 0)
);
--> statement-breakpoint
ALTER TABLE "game"."coin_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."daily_pack" (
	"game_day" date PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game"."daily_pack" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."daily_quests" (
	"user_id" uuid NOT NULL,
	"game_day" date NOT NULL,
	"slot" smallint NOT NULL,
	"quest_type" text NOT NULL,
	"target" integer NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "daily_quests_user_id_game_day_slot_pk" PRIMARY KEY("user_id","game_day","slot"),
	CONSTRAINT "daily_quests_slot_range" CHECK ("game"."daily_quests"."slot" between 1 and 3),
	CONSTRAINT "daily_quests_progress" CHECK ("game"."daily_quests"."progress" between 0 and "game"."daily_quests"."target")
);
--> statement-breakpoint
ALTER TABLE "game"."daily_quests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."feedback" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game"."feedback_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_description_length" CHECK (char_length("game"."feedback"."description") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "game"."feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."friend_requests" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game"."friend_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"status" "game"."request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "friend_requests_not_self" CHECK ("game"."friend_requests"."from_user_id" <> "game"."friend_requests"."to_user_id")
);
--> statement-breakpoint
ALTER TABLE "game"."friend_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."friendships" (
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_a_user_b_pk" PRIMARY KEY("user_a","user_b"),
	CONSTRAINT "friendships_ordered_pair" CHECK ("game"."friendships"."user_a" < "game"."friendships"."user_b")
);
--> statement-breakpoint
ALTER TABLE "game"."friendships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."minigame_attempts" (
	"user_id" uuid NOT NULL,
	"game_day" date NOT NULL,
	"state" jsonb NOT NULL,
	"status" "game"."minigame_status" DEFAULT 'in_progress' NOT NULL,
	"reward" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "minigame_attempts_user_id_game_day_pk" PRIMARY KEY("user_id","game_day")
);
--> statement-breakpoint
ALTER TABLE "game"."minigame_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."minigame_days" (
	"game_day" date PRIMARY KEY NOT NULL,
	"game" "game"."minigame" NOT NULL,
	"difficulty" "game"."difficulty" NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game"."minigame_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."notifications" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game"."notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"type" "game"."notification_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "game"."notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."pack_openings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game"."pack_openings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"set_id" text NOT NULL,
	"source" "game"."pack_source" NOT NULL,
	"price" integer NOT NULL,
	"cards" jsonb NOT NULL,
	"is_god_pack" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pack_openings_price" CHECK ("game"."pack_openings"."price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "game"."pack_openings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."pack_vouchers" (
	"user_id" uuid NOT NULL,
	"tier" smallint NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "pack_vouchers_user_id_tier_pk" PRIMARY KEY("user_id","tier"),
	CONSTRAINT "pack_vouchers_tier_range" CHECK ("game"."pack_vouchers"."tier" between 1 and 3),
	CONSTRAINT "pack_vouchers_quantity" CHECK ("game"."pack_vouchers"."quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "game"."pack_vouchers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."player_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"coins" integer NOT NULL,
	"slot_1_card_id" text,
	"slot_2_card_id" text,
	"piggy_last_collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"streak_day" smallint DEFAULT 0 NOT NULL,
	"last_daily_claim_day" date,
	CONSTRAINT "player_state_coins_non_negative" CHECK ("game"."player_state"."coins" >= 0),
	CONSTRAINT "player_state_streak_range" CHECK ("game"."player_state"."streak_day" between 0 and 7)
);
--> statement-breakpoint
ALTER TABLE "game"."player_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."profile_stats" (
	"user_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"stat" "game"."profile_stat" NOT NULL,
	CONSTRAINT "profile_stats_user_id_position_pk" PRIMARY KEY("user_id","position"),
	CONSTRAINT "profile_stats_position_range" CHECK ("game"."profile_stats"."position" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "game"."profile_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."sets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"series" text NOT NULL,
	"tier" smallint NOT NULL,
	"total" integer NOT NULL,
	"printed_total" integer,
	"release_date" date,
	"images" jsonb NOT NULL,
	CONSTRAINT "sets_tier_range" CHECK ("game"."sets"."tier" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "game"."sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."showcase" (
	"user_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"card_id" text NOT NULL,
	CONSTRAINT "showcase_user_id_position_pk" PRIMARY KEY("user_id","position"),
	CONSTRAINT "showcase_position_range" CHECK ("game"."showcase"."position" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "game"."showcase" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."trades" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game"."trades_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"offered_card_id" text NOT NULL,
	"requested_card_id" text NOT NULL,
	"status" "game"."request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "trades_not_self" CHECK ("game"."trades"."from_user_id" <> "game"."trades"."to_user_id")
);
--> statement-breakpoint
ALTER TABLE "game"."trades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."user_achievements" (
	"user_id" uuid NOT NULL,
	"achievement_id" integer NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "user_achievements_user_id_achievement_id_pk" PRIMARY KEY("user_id","achievement_id")
);
--> statement-breakpoint
ALTER TABLE "game"."user_achievements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" integer NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
ALTER TABLE "game"."user_badges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."user_cards" (
	"user_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"quantity" smallint NOT NULL,
	"first_acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_cards_user_id_card_id_pk" PRIMARY KEY("user_id","card_id"),
	CONSTRAINT "user_cards_quantity_range" CHECK ("game"."user_cards"."quantity" between 1 and 9)
);
--> statement-breakpoint
ALTER TABLE "game"."user_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"username_key" text GENERATED ALWAYS AS (lower(username)) STORED NOT NULL,
	"email" text NOT NULL,
	"email_key" text GENERATED ALWAYS AS (lower(email)) STORED NOT NULL,
	"password_hash" text NOT NULL,
	"avatar" smallint,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_format" CHECK ("game"."users"."username" ~ '^[A-Za-z0-9_]{3,20}$'),
	CONSTRAINT "users_avatar_range" CHECK ("game"."users"."avatar" between 1 and 7)
);
--> statement-breakpoint
ALTER TABLE "game"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "game"."cards" ADD CONSTRAINT "cards_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "game"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."coin_ledger" ADD CONSTRAINT "coin_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."daily_pack" ADD CONSTRAINT "daily_pack_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "game"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."daily_quests" ADD CONSTRAINT "daily_quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."friend_requests" ADD CONSTRAINT "friend_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."friend_requests" ADD CONSTRAINT "friend_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."friendships" ADD CONSTRAINT "friendships_user_a_users_id_fk" FOREIGN KEY ("user_a") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."friendships" ADD CONSTRAINT "friendships_user_b_users_id_fk" FOREIGN KEY ("user_b") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."minigame_attempts" ADD CONSTRAINT "minigame_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."minigame_attempts" ADD CONSTRAINT "minigame_attempts_game_day_minigame_days_game_day_fk" FOREIGN KEY ("game_day") REFERENCES "game"."minigame_days"("game_day") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."pack_openings" ADD CONSTRAINT "pack_openings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."pack_openings" ADD CONSTRAINT "pack_openings_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "game"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."pack_vouchers" ADD CONSTRAINT "pack_vouchers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."player_state" ADD CONSTRAINT "player_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."player_state" ADD CONSTRAINT "player_state_slot_1_owned_fk" FOREIGN KEY ("user_id","slot_1_card_id") REFERENCES "game"."user_cards"("user_id","card_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."player_state" ADD CONSTRAINT "player_state_slot_2_owned_fk" FOREIGN KEY ("user_id","slot_2_card_id") REFERENCES "game"."user_cards"("user_id","card_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."profile_stats" ADD CONSTRAINT "profile_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."showcase" ADD CONSTRAINT "showcase_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."showcase" ADD CONSTRAINT "showcase_card_owned_fk" FOREIGN KEY ("user_id","card_id") REFERENCES "game"."user_cards"("user_id","card_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."trades" ADD CONSTRAINT "trades_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."trades" ADD CONSTRAINT "trades_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."trades" ADD CONSTRAINT "trades_offered_card_id_cards_id_fk" FOREIGN KEY ("offered_card_id") REFERENCES "game"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."trades" ADD CONSTRAINT "trades_requested_card_id_cards_id_fk" FOREIGN KEY ("requested_card_id") REFERENCES "game"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "game"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "game"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."user_cards" ADD CONSTRAINT "user_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "game"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game"."user_cards" ADD CONSTRAINT "user_cards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "game"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_set_id_idx" ON "game"."cards" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "coin_ledger_user_idx" ON "game"."coin_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "friend_requests_one_pending_per_pair" ON "game"."friend_requests" USING btree (least("from_user_id", "to_user_id"),greatest("from_user_id", "to_user_id")) WHERE "game"."friend_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "friend_requests_to_user_idx" ON "game"."friend_requests" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "friendships_user_b_idx" ON "game"."friendships" USING btree ("user_b");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "game"."notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "pack_openings_user_idx" ON "game"."pack_openings" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_stats_stat_once_idx" ON "game"."profile_stats" USING btree ("user_id","stat");--> statement-breakpoint
CREATE UNIQUE INDEX "showcase_card_once_idx" ON "game"."showcase" USING btree ("user_id","card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trades_one_pending_per_direction" ON "game"."trades" USING btree ("from_user_id","to_user_id") WHERE "game"."trades"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "trades_to_user_idx" ON "game"."trades" USING btree ("to_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key_idx" ON "game"."users" USING btree ("username_key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key_idx" ON "game"."users" USING btree ("email_key");