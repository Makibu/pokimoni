import {Award, Boxes, Coins, Crown, Gem, Package, Star, Trophy} from "lucide-react";

type Badge = {
    id: string;
    name: string;
    description: string;
    type: "collection" | "rarity" | "income" | "packs";
    amount: number | null;
    unit: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
};

export const badges: Badge[] = [
    {
        id: "1",
        name: "Kolekcjoner",
        description: "Zdobycie 1000 kart w kolekcji",
        type: "collection",
        amount: 1000,
        unit: "cards",
        icon: Award,
    },
    {
        id: "2",
        name: "Mistrz Rzadkości",
        description: "Zdobycie przynajmniej jednej karty typu Secret Rare",
        type: "rarity",
        amount: 1,
        unit: "special_rare_cards",
        icon: Star,
    },
    {
        id: "3",
        name: "Bogacz",
        description: "Posiadanie przychodu równego 30 monet lub więcej",
        type: "income",
        amount: 30,
        unit: "coins_income",
        icon: Coins,
    },
    {
        id: "4",
        name: "Łowca Secret Rare",
        description: "Zdobądź 3 karty typu Secret Rare",
        type: "rarity",
        amount: 3,
        unit: "special_rare_cards",
        icon: Gem,
    },
    {
        id: "5",
        name: "Ćwierć Kolekcji",
        description: "Zdobądź 250 kart",
        type: "collection",
        amount: 250,
        unit: "cards",
        icon: Award,
    },
    {
        id: "6",
        name: "Mistrz Kolekcji",
        description: "Zdobądź wszystkie karty",
        type: "collection",
        amount: null,
        unit: "all_cards",
        icon: Trophy,
    },
    {
        id: "7",
        name: "Otwarcie Tysiąca",
        description: "Otwórz 1000 paczek",
        type: "packs",
        amount: 1000,
        unit: "packs",
        icon: Boxes,
    },
    {
        id: "8",
        name: "Otwarcie Setki",
        description: "Otwórz 100 paczek",
        type: "packs",
        amount: 100,
        unit: "packs",
        icon: Package,
    },
    {
        id: "9",
        name: "Elita Rzadkości",
        description: "Zdobądź 150 kart typu Special Illustration Rare lub wyższego",
        type: "rarity",
        amount: 150,
        unit: "special_illustration_plus_cards",
        icon: Crown,
    },
];
