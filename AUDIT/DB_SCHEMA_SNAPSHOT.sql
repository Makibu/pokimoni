-- Snapshot schematu Supabase dostarczony przez właściciela 2026-11-03 (eksport "for context only").
-- Zawiera tylko tabele. Brak: widoków (user_unclaimed_achievements_flag), funkcji
-- (choose_daily_pack_for_today), cronów, polityk RLS, indeksów nie-PK, klauzul ON DELETE.
-- Nie uruchamiać — kolejność i constrainty mogą być nieprawidłowe.

CREATE TABLE public.users (
  uid uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  avatar smallint,
  CONSTRAINT users_pkey PRIMARY KEY (uid)
);
CREATE TABLE public.user_stats (
  uid uuid NOT NULL,
  total_cards integer DEFAULT 0,
  total_unique_cards integer DEFAULT 0,
  total_packs integer DEFAULT 0,
  coins integer NOT NULL DEFAULT 500,
  daily_coins_flag boolean NOT NULL DEFAULT true,
  slot_1 text,
  slot_2 text,
  sudoku_flag boolean NOT NULL DEFAULT false,
  minesweeper_flag boolean NOT NULL DEFAULT false,
  CONSTRAINT user_stats_pkey PRIMARY KEY (uid),
  CONSTRAINT user_stats_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid),
  CONSTRAINT user_stats_slot_1_fkey FOREIGN KEY (slot_1) REFERENCES public.cards(id),
  CONSTRAINT user_stats_slot_2_fkey FOREIGN KEY (slot_2) REFERENCES public.cards(id)
);
CREATE TABLE public.sets (
  id text NOT NULL,
  name text NOT NULL,
  series text,
  printed_total integer,
  total integer,
  ptcgo_code text,
  release_date date,
  images jsonb,
  class smallint NOT NULL DEFAULT '0'::smallint,
  CONSTRAINT sets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cards (
  id text NOT NULL,
  name text NOT NULL,
  subtypes jsonb,
  set_id text,
  rarity text,
  images jsonb,
  income integer,
  CONSTRAINT cards_pkey PRIMARY KEY (id),
  CONSTRAINT cards_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.sets(id)
);
CREATE TABLE public.user_cards (
  uid uuid NOT NULL,
  card_id text NOT NULL,
  quantity integer DEFAULT 1,
  acquired_at timestamp without time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  CONSTRAINT user_cards_pkey PRIMARY KEY (id),
  CONSTRAINT user_cards_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid),
  CONSTRAINT user_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id)
);
CREATE TABLE public.user_packs (
  id integer NOT NULL DEFAULT nextval('user_packs_id_seq'::regclass),
  uid uuid,
  set_id text,
  opened_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_packs_pkey PRIMARY KEY (id),
  CONSTRAINT user_packs_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid),
  CONSTRAINT user_packs_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.sets(id)
);
CREATE TABLE public.achievements (
  id integer NOT NULL DEFAULT nextval('achievements_id_seq'::regclass),
  title text NOT NULL,
  description text,
  reward jsonb,
  rarity text,
  type text,
  amount integer,
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_achievements (
  uid uuid NOT NULL,
  achievement_id integer NOT NULL,
  unlocked_at timestamp without time zone DEFAULT now(),
  claimed_flag boolean NOT NULL DEFAULT false,
  CONSTRAINT user_achievements_pkey PRIMARY KEY (uid, achievement_id),
  CONSTRAINT user_achievements_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid),
  CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id)
);
CREATE TABLE public.badges (
  id integer NOT NULL DEFAULT nextval('badges_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  type text NOT NULL,
  description text NOT NULL,
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_badges (
  user_id uuid NOT NULL,
  badge_id integer NOT NULL,
  acquired_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (user_id, badge_id),
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(uid)
);
CREATE TABLE public.daily_sudoku (
  board jsonb NOT NULL,
  solution jsonb NOT NULL,
  difficulty text,
  id integer NOT NULL DEFAULT nextval('daily_sudoku_id_seq'::regclass),
  CONSTRAINT daily_sudoku_pkey PRIMARY KEY (id)
);
CREATE TABLE public.daily_pack_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  set_id text,
  chosen_at date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT daily_pack_history_pkey PRIMARY KEY (id),
  CONSTRAINT daily_pack_history_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.sets(id)
);
CREATE TABLE public.daily_pack (
  date date NOT NULL DEFAULT CURRENT_DATE,
  set_id text NOT NULL,
  CONSTRAINT daily_pack_pkey PRIMARY KEY (date),
  CONSTRAINT daily_pack_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.sets(id)
);
CREATE TABLE public.feedback (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  uid uuid,
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid)
);
CREATE TABLE public.daily_minesweeper (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  board jsonb NOT NULL,
  difficulty text NOT NULL,
  CONSTRAINT daily_minesweeper_pkey PRIMARY KEY (id)
);

-- Widok (dostarczony 2026-11-03)
create view public.user_unclaimed_achievements_flag as
select uid,
       (exists (select 1 from user_achievements ua
                where ua.uid = u.uid and ua.claimed_flag = false)) as has_unclaimed_achievements
from users u;

-- Funkcja choose_daily_pack_for_today() — samo ciało (sygnatura nie podana; zwraca (date, set_id))
-- declare
--   today_date date := current_date;
-- begin
--   if exists (select 1 from public.daily_pack where daily_pack.date = today_date) then
--     return query select daily_pack.date, daily_pack.set_id from public.daily_pack where daily_pack.date = today_date;
--     return;
--   end if;
--   with usage_counts as (
--     select dph.set_id as set_ref, count(*) as usage_count from public.daily_pack_history dph group by dph.set_id
--   ),
--   weighted_sets as (
--     select s.id, (4 - s.class)::numeric as class_weight, coalesce(u.usage_count, 0) as usage_count
--     from public.sets s left join usage_counts u on u.set_ref = s.id
--   ),
--   weighted_values as (
--     select ws.id, (ws.class_weight / (ws.usage_count + 1)) as weight from weighted_sets ws
--   ),
--   chosen as (
--     select id from (
--       select id, weight, sum(weight) over () as total_weight,
--              sum(weight) over (order by id) - weight as lower_bound
--       from weighted_values
--     ) t
--     where random() * total_weight >= lower_bound
--     order by random()
--     limit 1
--   )
--   insert into public.daily_pack(date, set_id) select today_date, c.id from chosen c on conflict (date) do nothing;
--   return query select dp.date, dp.set_id from public.daily_pack dp where dp.date = today_date;
-- end;

-- pg_cron (ze zrzutu ekranu, harmonogramy w UTC)
-- daily_user_stats_update   0 23 * * *  aktywny    UPDATE public.user_stats SET daily_coins_flag = true;
-- hourly_income             0 * * * *   aktywny    SELECT public.add_hourly_income();   -- definicja funkcji: brak
-- daily_sudoku_change       0 22 * * *  WYŁĄCZONY  UPDATE public.user_stats SET sudoku_flag = false;
-- daily_minigames_reset     0 23 * * *  aktywny    UPDATE user_stats SET sudoku_flag = false, minesweeper_flag = false;
--                                                   SELECT delete_daily_sudoku(); SELECT delete_daily_minesweeper();
--   delete_daily_sudoku():      begin delete from daily_sudoku; end;
--   delete_daily_minesweeper(): begin delete from daily_minesweeper; end;
--
-- add_hourly_income():
-- BEGIN
--   UPDATE public.user_stats
--   SET coins = coins + LEAST(
--       COALESCE((SELECT income FROM public.cards WHERE id = slot_1), 0)
--       + COALESCE((SELECT income FROM public.cards WHERE id = slot_2), 0),
--       1000 - coins)
--   WHERE coins < 1000;
-- END;
-- Daily_minesweeper_change  0 22 * * *  WYŁĄCZONY  update public.user_stats set minesweeper_flag = FALSE
