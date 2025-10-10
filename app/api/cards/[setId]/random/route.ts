import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";
import {normalizeRarity} from "@/lib/normalizeRarity";
import {Card} from "@/lib/types";

function pickCardByRarity(cards: Card[], rarityWeights: Record<string, number>) {
    const weightedCards = cards
        .filter((c) => rarityWeights[normalizeRarity(c.rarity)] > 0)
        .map((c) => ({...c, weight: rarityWeights[normalizeRarity(c.rarity)]}));

    if (weightedCards.length === 0) {
        const fallback = cards.map((c) => ({...c, weight: 1}));
        const totalWeight = fallback.reduce((sum, c) => sum + c.weight, 0);
        let rnd = Math.random() * totalWeight;
        for (const card of fallback) {
            rnd -= card.weight;
            if (rnd <= 0) return card;
        }
        return fallback[fallback.length - 1];
    }

    const totalWeight = weightedCards.reduce((sum, c) => sum + c.weight, 0);
    let rnd = Math.random() * totalWeight;
    for (const card of weightedCards) {
        rnd -= card.weight;
        if (rnd <= 0) return card;
    }
    return weightedCards[weightedCards.length - 1];
}

function generatePack(cards: Card[]) {
    const isGodPack = Math.random() < 0.0005;
    const availableRarities = new Set(cards.map((c) => normalizeRarity(c.rarity)));

    const weightsPerPosition: Record<number, Record<string, number>> = {
        0: {
            common: 80,
            uncommon: 15,
            rare: 4,
            "double rare": 0.5,
            "ultra rare": 0.3,
            "ace spec rare": 0.1,
            "illustration rare": 0.05,
            "special illustration rare": 0.05,
            "hyper rare": 0.01,
            "secret rare": 0.01,
        },
        1: {
            common: 80,
            uncommon: 15,
            rare: 4,
            "double rare": 0.5,
            "ultra rare": 0.3,
            "ace spec rare": 0.1,
            "illustration rare": 0.05,
            "special illustration rare": 0.05,
            "hyper rare": 0.01,
            "secret rare": 0.01,
        },
        2: {
            common: 80,
            uncommon: 15,
            rare: 4,
            "double rare": 0.5,
            "ultra rare": 0.3,
            "ace spec rare": 0.1,
            "illustration rare": 0.05,
            "special illustration rare": 0.05,
            "hyper rare": 0.01,
            "secret rare": 0.01,
        },
        3: {
            common: 0,
            uncommon: 20,
            rare: 40,
            "double rare": 20,
            "ultra rare": 10,
            "ace spec rare": 5,
            "illustration rare": 3,
            "special illustration rare": 2,
            "hyper rare": 0.5,
            "secret rare": 0.5,
        },
        4: {
            common: 0,
            uncommon: 0,
            rare: 40,
            "double rare": 30,
            "ultra rare": 15,
            "ace spec rare": 5,
            "illustration rare": 4.5,
            "special illustration rare": 3,
            "hyper rare": 2,
            "secret rare": 0.5,
        },
    };

    const pack: Card[] = [];

    for (let i = 0; i < 5; i++) {
        let weights: Record<string, number>;

        if (isGodPack) {
            weights = {
                "illustration rare": availableRarities.has("illustration rare") ? 1 : 0,
                "special illustration rare": availableRarities.has("special illustration rare") ? 1 : 0,
                "hyper rare": availableRarities.has("hyper rare") ? 1 : 0,
                "secret rare": availableRarities.has("secret rare") ? 1 : 0,
            };
        } else {
            weights = {};
            const baseWeights = weightsPerPosition[i];
            for (const rarity in baseWeights) {
                weights[rarity] = availableRarities.has(rarity) ? baseWeights[rarity] : 0;
            }
        }

        const card = pickCardByRarity(cards, weights);
        pack.push(card);
    }

    return {pack, isGodPack};
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const setId = pathSegments[pathSegments.indexOf("cards") + 1];

    if (!setId) {
        return NextResponse.json({error: "Brak setId w URL"}, {status: 400});
    }

    const {data: cards, error} = await supabaseServer
        .from("cards")
        .select("*")
        .eq("set_id", setId);

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    if (!cards || cards.length === 0) {
        return NextResponse.json({error: "No cards found for this set."}, {status: 404});
    }

    const {pack, isGodPack} = generatePack(cards);

    return NextResponse.json({pack, isGodPack});
}
