import path from "node:path";
import {type Browser, expect, type Page, test} from "@playwright/test";
import {
    applyAction,
    type CatalogCard,
    createMinigame,
    type MinigameAction,
    type MinigameState,
    type MinigameVariant,
    viewOf,
} from "@/domain/minigames";
import type {MemoryState} from "@/domain/minigames/memory";
import type {WhoIsItRound} from "@/domain/minigames/who-is-it";
import {clueSourceUrl, fetchCardImage, renderClue} from "@/server/minigames/clue-image";
import {seededRng} from "../helpers/rng";
import {register} from "../e2e/helpers";

/** Screenshots of the daily features for the owner's acceptance. Run with SCREENS_OUT=<dir>. */
const OUT = process.env.SCREENS_OUT ?? "";
const VIEWPORTS = [
    {name: "360", width: 360, height: 640},
    {name: "1280", width: 1280, height: 800},
];

async function player(
    browser: Browser,
    baseURL: string | undefined,
    name: string,
    viewport: {width: number; height: number},
    dark: boolean,
) {
    const context = await browser.newContext({baseURL, viewport, colorScheme: dark ? "dark" : "light"});
    const page = await context.newPage();
    await page.addInitScript((theme) => localStorage.setItem("theme", theme), dark ? "dark" : "light");
    await page.emulateMedia({reducedMotion: "reduce"});
    await register(page, {username: name, email: `${name}@example.com`});
    return page;
}

const shot = async (page: Page, name: string, fullPage = false) => {
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.screenshot({path: path.join(OUT, `${name}.png`), fullPage});
};

/** Real cards of the catalog, so the screenshots show real art. */
async function catalogFrom(page: Page): Promise<CatalogCard[]> {
    const cards = await page.evaluate(async () => {
        const sets = await (await fetch("/api/collection")).json();
        const result = [];
        for (const {id} of sets.slice(0, 3)) {
            const {cards: list} = await (await fetch(`/api/collection/${id}`)).json();
            result.push(...list);
        }
        return result as {
            id: string;
            name: string;
            rarity: CatalogCard["rarity"];
            imageSmall: string;
            imageLarge: string;
        }[];
    });
    return cards
        .filter((card) => !card.name.endsWith("Energy"))
        .map(({id, name, rarity, imageSmall, imageLarge}) => ({
            id,
            name,
            rarity,
            images: {small: imageSmall, large: imageLarge},
            subtypes: ["Basic"],
        }));
}

async function serveGame(page: Page, variant: MinigameVariant, catalog: CatalogCard[], actions: MinigameAction[] = []) {
    let state: MinigameState = createMinigame(variant, catalog, seededRng(11));
    let status = "in_progress";
    const today = () => ({
        game: variant.game,
        difficulty: variant.difficulty,
        reward: 175,
        status,
        view: viewOf(state),
    });
    const play = (action: MinigameAction) => {
        const result = applyAction(state, action);
        state = result.state;
        status = result.outcome;
    };
    for (const action of actions) play(action);
    await page.route("**/api/minigame", (route) => route.fulfill({json: today()}));
    await page.route("**/api/minigame/action", async (route) => {
        play(route.request().postDataJSON() as MinigameAction);
        await route.fulfill({json: today()});
    });
    return () => state;
}

for (const viewport of VIEWPORTS) {
    for (const dark of [false, true]) {
        const label = `${viewport.name}-${dark ? "dark" : "light"}`;

        test(`daily screens ${label}`, async ({browser, baseURL}) => {
            test.setTimeout(240_000);
            const suffix = `${viewport.name}${dark ? "d" : "l"}${Date.now().toString(36)}`;
            const page = await player(browser, baseURL, `Ekran_${suffix}`, viewport, dark);
            const catalog = await catalogFrom(page);

            await page.goto("/");
            await expect(page.getByRole("region", {name: "Zadania dnia"}).getByRole("listitem")).toHaveCount(3);
            await page.getByRole("region", {name: "Zadania dnia"}).scrollIntoViewIfNeeded();
            await shot(page, `home-${label}`, true);

            // Real server, real pictures: the start panel, then the blurred clue.
            await page.goto("/minigame");
            await page.getByRole("button", {name: "Zacznij"}).click();
            await expect(page.getByText("Runda 1 z 5")).toBeVisible();
            await page.waitForTimeout(1500);
            await shot(page, `who-easy-${label}`, true);

            for (const difficulty of ["medium", "hard"] as const) {
                // The real server has the easy level today, so these two levels get their real pictures here.
                await page.unrouteAll();
                const current = await serveGame(page, {game: "who_is_it", difficulty}, catalog);
                await page.route("**/api/minigame/picture**", async (route) => {
                    const state = current();
                    if (state.game !== "who_is_it") throw new Error("Wrong game");
                    const round: WhoIsItRound = state.rounds[state.results.length];
                    const source = await fetchCardImage(clueSourceUrl(round, difficulty));
                    await route.fulfill({
                        contentType: "image/webp",
                        body: await renderClue(source, round, difficulty),
                    });
                });
                await page.goto("/minigame");
                await expect(page.getByText("Runda 1 z 5")).toBeVisible();
                await page.waitForTimeout(1500);
                await shot(page, `who-${difficulty}-${label}`, true);
            }

            const memory = {game: "memory", difficulty: "hard"} as const;
            const state = createMinigame(memory, catalog, seededRng(11)) as MemoryState;
            const positions = (value: number) => state.deck.flatMap((v, p) => (v === value ? [p] : []));
            await page.unrouteAll();
            await serveGame(page, memory, catalog, [
                {type: "flip", position: positions(0)[0]},
                {type: "flip", position: positions(0)[1]},
                {type: "flip", position: positions(1)[0]},
                {type: "flip", position: positions(2)[0]},
            ]);
            await page.goto("/minigame");
            await expect(page.getByText("Pomyłki: 1 z 15")).toBeVisible();
            await page.waitForTimeout(800);
            await shot(page, `memory-hard-${label}`, true);

            await page.unrouteAll();
            await serveGame(page, {game: "sliding_puzzle", difficulty: "medium"}, catalog);
            await page.goto("/minigame");
            await expect(page.getByText("Ruchy: 0")).toBeVisible();
            await page.waitForTimeout(1200);
            await shot(page, `puzzle-medium-${label}`, true);
            await page.getByRole("button", {name: "Numery"}).click();
            await shot(page, `puzzle-numbers-${label}`, true);

            // A won and a lost game.
            const puzzle = createMinigame({game: "sliding_puzzle", difficulty: "easy"}, catalog, seededRng(11));
            await page.unrouteAll();
            await page.route("**/api/minigame", (route) =>
                route.fulfill({
                    json: {
                        game: "sliding_puzzle",
                        difficulty: "easy",
                        reward: 100,
                        status: "won",
                        view: viewOf({...puzzle, tiles: [1, 2, 3, 4, 5, 6, 7, 8, 0], moves: 64} as MinigameState),
                    },
                }),
            );
            await page.goto("/minigame");
            await expect(page.getByRole("heading", {name: /Wygrana/})).toBeVisible();
            await page.waitForTimeout(1000);
            await shot(page, `won-${label}`, true);

            await page.goto("/");
            await expect(page.getByRole("link", {name: "Zobacz wynik"})).toBeVisible();
            await page.getByRole("region", {name: "Minigra dnia"}).scrollIntoViewIfNeeded();
            await shot(page, `home-finished-${label}`);

            // The home block's picture for each game.
            for (const game of ["who_is_it", "memory", "sliding_puzzle"] as const) {
                await page.unrouteAll();
                await page.route("**/api/minigame", (route) =>
                    route.fulfill({json: {game, difficulty: "medium", reward: 175, status: "not_started", view: null}}),
                );
                await page.goto("/");
                const block = page.getByRole("region", {name: "Minigra dnia"});
                await expect(block.getByRole("link", {name: "Zagraj"})).toBeVisible();
                await page.waitForLoadState("networkidle").catch(() => undefined);
                await block.screenshot({path: path.join(OUT, `art-${game}-${label}.png`)});
            }

            await page.context().close();
        });
    }
}
