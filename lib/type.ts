export interface Achievement {
    id: number;
    description: string
    title: string;
    reward: string[]
    rarity: string
    type: string
    amount: number
}

export interface BadgeType {
    id: number;
    name: string;
    description: string;
    type: string;
}

export interface Card {
    id: string;
    name: string;
    subtypes?: string[]
    set_id?: string
    rarity?: string
    images?: { large: string; small: string }
    income: number | null
}

export interface Set {
    id: string;
    name: string;
    series?: string
    printed_total?: number
    total?: number
    ptcgo_code?: string
    release_date?: string
    images?: { logo: string; symbol: string }
    class?: 1 | 2 | 3 | 0;
}

export interface UserAchievement {
    uid: string;
    achievement_id: number;
    unlocked_at?: string
}

export interface UserBadge {
    user_id: string;
    badge_id: number;
    acquired_at?: string
}

export interface UserCard {
    id: number;
    uid: string;
    card_id: string;
    quantity?: number;
    acquired_at?: string
}

export interface UserCardWithCard {
    id: number;
    uid: string;
    card_id: string;
    quantity?: number;
    acquired_at?: string;
    cards: Card;
}

export interface UserPack {
    id: number;
    uid?: string
    set_id?: string
    opened_at?: string
}

export interface UserStats {
    uid: string;
    total_cards: number;
    total_unique_cards: number;
    total_packs: number;
    total_achievements: number;
    totalAchievementsCount: number;
    coins: number;
    rarityStats: {
        rarity: string;
        count: number;
        percent: number;
    }[];
    favoritePack: {
        name: string;
        opened: number;
        images: { logo: string; symbol: string };
    };
    total_duplicates: number;
    daily_coins_flag: boolean;
    slot_1: string,
    slot_2: string,
    bestCard: Card,
    cardsTotal: number,
    userBadges: { badge_id: number }[],
    recentActivity: {
        action: string,
        item: string,
        time: string,
    }[]
}

export interface User {
    uid: string;
    username: string;
    email: string;
    password: string;
    created_at?: string
}

export interface SlotsData {
    slot_1?: string | null;
    slot_2?: string | null;
    cards_1?: SlotCard;
    cards_2?: SlotCard;
}

export interface SlotCard {
    id: string;
    name: string;
    rarity?: string;
    income?: number;
}