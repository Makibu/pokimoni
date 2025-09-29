import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";
import {normalizeRarity} from "@/lib/normalizeRarity";

function pickCardByRarity(cards: any[], rarityWeights: Record<string, number>) {
    let weightedCards = cards
        .filter((c) => rarityWeights[normalizeRarity(c.rarity)] > 0)
        .map((c) => ({
            ...c,
            weight: rarityWeights[normalizeRarity(c.rarity)],
        }));

    if (weightedCards.length === 0) {
        weightedCards = cards.map((c) => ({...c, weight: 1}));
    }

    const totalWeight = weightedCards.reduce((sum, c) => sum + c.weight, 0);
    let rnd = Math.random() * totalWeight;

    for (const card of weightedCards) {
        rnd -= card.weight;
        if (rnd <= 0) return card;
    }

    return weightedCards[weightedCards.length - 1];
}

function generatePack(cards: any[]) {
    const isGodPack = Math.random() < 0.0005;
    const availableRarities = new Set(cards.map((c) => normalizeRarity(c.rarity)));

    const firstThreeWeights: Record<string, number> = {
        common: availableRarities.has("common") ? 90 : 0,
        uncommon: availableRarities.has("uncommon") ? 10 : 0,
        rare: 0,
        "double rare": 0,
        "ultra rare": 0,
        "ace spec rare": 0,
        "illustration rare": 0,
        "special illustration rare": 0,
        "hyper rare": 0,
        "secret rare": 0,
    };

    const fourthCardWeights: Record<string, number> = {
        common: 0,
        uncommon: availableRarities.has("uncommon") ? 20 : 0,
        rare: availableRarities.has("rare") ? 40 : 0,
        "double rare": availableRarities.has("double rare") ? 20 : 0,
        "ultra rare": availableRarities.has("ultra rare") ? 10 : 0,
        "ace spec rare": availableRarities.has("ace spec rare") ? 5 : 0,
        "illustration rare": availableRarities.has("illustration rare") ? 3 : 0,
        "special illustration rare": availableRarities.has("special illustration rare") ? 2 : 0,
        "hyper rare": availableRarities.has("hyper rare") ? 0.5 : 0,
        "secret rare": availableRarities.has("secret rare") ? 0.5 : 0,
    };

    const fifthCardWeights: Record<string, number> = {
        common: 0,
        uncommon: 0,
        rare: availableRarities.has("rare") ? 1 : 0,
        "double rare": availableRarities.has("double rare") ? 1 : 0,
        "ultra rare": availableRarities.has("ultra rare") ? 1 : 0,
        "ace spec rare": availableRarities.has("ace spec rare") ? 1 : 0,
        "illustration rare": availableRarities.has("illustration rare") ? 1 : 0,
        "special illustration rare": availableRarities.has("special illustration rare") ? 5 : 0,
        "hyper rare": availableRarities.has("hyper rare") ? 1 : 0,
        "secret rare": availableRarities.has("secret rare") ? 150 : 0,
    };

    const pack: any[] = [];

    for (let i = 0; i < 5; i++) {
        let weights: Record<string, number>;
        if (isGodPack) {
            weights = {
                "illustration rare": availableRarities.has("illustration rare") ? 1 : 0,
                "special illustration rare": availableRarities.has("special illustration rare") ? 1 : 0,
                "hyper rare": availableRarities.has("hyper rare") ? 1 : 0,
                "secret rare": availableRarities.has("secret rare") ? 1 : 0,
            };
        } else if (i < 3) {
            weights = firstThreeWeights;
        } else if (i === 3) {
            weights = fourthCardWeights;
        } else {
            weights = fifthCardWeights;
        }

        const card = pickCardByRarity(cards, weights);
        pack.push(card);
    }

    // Wymuś Secret Rare, jeśli dostępny
    if (availableRarities.has("secret rare")) {
        const hasSecret = pack.some((c) => normalizeRarity(c.rarity) === "secret rare");
        if (!hasSecret) {
            const secretCards = cards.filter((c) => normalizeRarity(c.rarity) === "secret rare");
            if (secretCards.length > 0) {
                pack[pack.length - 1] =
                    secretCards[Math.floor(Math.random() * secretCards.length)];
            }
        }
    }

    return {pack, isGodPack};
}

export async function GET(
    req: Request,
    context: { params: { setId: string } }
) {
    const {setId} = await context.params;

    const {data: cards, error} = await supabaseServer
        .from("cards")
        .select("*")
        .eq("set_id", setId);

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    if (!cards || cards.length === 0) {
        return NextResponse.json(
            {error: "No cards found for this set."},
            {status: 404}
        );
    }

    const {pack, isGodPack} = generatePack(cards);

    return NextResponse.json({pack, isGodPack});
}
