import {expect, type Page, test} from "@playwright/test";
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
import type {PuzzleState} from "@/domain/minigames/sliding-puzzle";
import {seededRng} from "../helpers/rng";
import {expectNoViolations, register, uniquePlayer} from "./helpers";

// A real game needs the day's variant, which the test database fixes as easy "Kto to Pokémon?". The other
// variants run on the real game rules in this test process, in place of the server and its random day.
const CARD_IMAGE = "https://images.pokemontcg.io/sv1/1.png";
const CATALOG: CatalogCard[] = Array.from({length: 40}, (_, index) => ({
    id: `card-${index}`,
    name: `Pokemon ${index}`,
    rarity: "illustration rare",
    images: {small: CARD_IMAGE, large: CARD_IMAGE},
    subtypes: ["Basic"],
}));

/** Answers the minigame endpoints from the real game rules, keeping the state on this side. */
async function serveGame(page: Page, variant: MinigameVariant, change?: (state: MinigameState) => MinigameState) {
    let state = createMinigame(variant, CATALOG, seededRng(7));
    if (change) state = change(state);
    let status = "in_progress";
    const today = () => ({
        game: variant.game,
        difficulty: variant.difficulty,
        reward: 100,
        status,
        view: viewOf(state),
    });

    await page.route("**/api/minigame", (route) => route.fulfill({json: today()}));
    await page.route("**/api/minigame/action", async (route) => {
        const action = route.request().postDataJSON() as MinigameAction;
        const result = applyAction(state, action);
        state = result.state;
        status = result.outcome;
        await route.fulfill({json: today()});
    });
    return {current: () => state};
}

test.describe("daily quests and minigame", () => {
    test("the home page shows the day's quests and game", async ({page}, testInfo) => {
        await register(page, uniquePlayer(testInfo.project.name));
        const quests = page.getByRole("region", {name: "Zadania dnia"});
        await expect(quests.getByRole("listitem")).toHaveCount(3);
        await expect(quests.getByText(/0 z \d/).first()).toBeVisible();
        const game = page.getByRole("region", {name: "Minigra dnia"});
        await expect(game.getByText("Kto to Pokémon? · poziom łatwy")).toBeVisible();
        await expect(game.getByRole("link", {name: "Zagraj"})).toHaveAttribute("href", "/minigame");
    });

    test("a finished quest pays once, on request", async ({page}, testInfo) => {
        await register(page, uniquePlayer(testInfo.project.name));
        await page.route("**/api/quests", (route) =>
            route.fulfill({
                json: [{slot: 1, title: "Otwórz 2 paczki", target: 2, progress: 2, reward: 75, claimed: false}],
            }),
        );
        let claims = 0;
        await page.route("**/api/quests/1/claim", (route) => {
            claims++;
            return route.fulfill({json: {coins: 1075, reward: 75}});
        });
        await page.goto("/");
        await page.getByRole("button", {name: "Odbierz 75"}).click();
        await expect(page.getByText("Odebrano 75 monet!")).toBeVisible();
        const quest = page.getByRole("region", {name: "Zadania dnia"});
        await expect(quest.getByText("Odebrano", {exact: true})).toBeVisible();
        await expect(page.getByRole("button", {name: "Odbierz 75"})).toHaveCount(0);
        expect(claims).toBe(1);
    });

    test("Kto to Pokémon can be played to the end, surviving a reload", async ({page}, testInfo) => {
        test.slow();
        await register(page, uniquePlayer(testInfo.project.name));
        const coinsBefore = await page.evaluate(async () => (await (await fetch("/api/player")).json()).coins);

        await page.goto("/minigame");
        await page.getByRole("button", {name: "Zacznij"}).click();
        await expect(page.getByText("Runda 1 z 5")).toBeVisible();

        const picture = await page.request.get("/api/minigame/picture");
        // 502 only means the external image host did not answer; the game then offers another try.
        expect([200, 502]).toContain(picture.status());
        if (picture.status() === 200) {
            expect(picture.headers()["content-type"]).toBe("image/webp");
            const clue = page.getByRole("img", {name: "Obrazek do rozpoznania"});
            await expect.poll(() => clue.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
        } else {
            testInfo.annotations.push({type: "warning", description: "The image host did not answer"});
            await expect(page.getByRole("button", {name: "Spróbuj ponownie"})).toBeVisible();
        }

        await expectNoViolations(page, "a round of Kto to Pokémon");
        const answers = page.getByTestId("answers").getByRole("button");
        await answers.first().click();
        await expect(page.getByRole("button", {name: "Dalej"})).toBeVisible();
        await expect(page.getByRole("img", {name: /^Karta: /})).toBeVisible();

        // A reload keeps the answered round: the game goes on from the next one.
        await page.reload();
        await expect(page.getByText("Runda 2 z 5")).toBeVisible();

        for (let round = 2; round <= 5; round++) {
            await expect(page.getByText(`Runda ${round} z 5`)).toBeVisible();
            await answers.first().click();
            if (round < 5) await page.getByRole("button", {name: "Dalej"}).click();
        }

        const heading = page.getByRole("heading", {name: /Wygrana|Tym razem/});
        await expect(heading).toBeVisible();
        await expect(page.getByText(/Dobre odpowiedzi: \d z 5\./)).toBeVisible();

        const won = (await heading.textContent())?.startsWith("Wygrana");
        const coinsAfter = await page.evaluate(async () => (await (await fetch("/api/player")).json()).coins);
        expect(coinsAfter).toBe(coinsBefore + (won ? 100 : 0));

        // The day's attempt is used: after a reload the result stays, and no game can be started.
        await page.reload();
        await expect(heading).toBeVisible();
        await expect(page.getByRole("button", {name: "Zacznij"})).toHaveCount(0);

        await page.goto("/");
        await expect(page.getByRole("link", {name: "Zobacz wynik"})).toBeVisible();
        const finished = page.getByRole("region", {name: "Zadania dnia"});
        await expect(finished.getByRole("listitem")).toHaveCount(3);
    });

    test("Memory: pairs stay, mismatches turn back, and the game ends", async ({page}, testInfo) => {
        await register(page, uniquePlayer(testInfo.project.name));
        const game = await serveGame(page, {game: "memory", difficulty: "easy"});
        await page.goto("/minigame");

        const {deck} = game.current() as MemoryState;
        const card = (position: number) => page.getByRole("button", {name: new RegExp(`^Karta ${position + 1}[,:]`)});
        const pair = (value: number) => deck.flatMap((entry, position) => (entry === value ? [position] : []));

        // A mismatch counts, then turns back by itself.
        await card(pair(0)[0]).click();
        await card(pair(1)[0]).click();
        await expect(page.getByText("Pomyłki: 1")).toBeVisible();
        await expect(card(pair(1)[0])).toHaveAccessibleName(/: Pokemon/);
        await expect(card(pair(1)[0])).toHaveAccessibleName(/zakryta/);

        // Fast taps reach the server in order, so a whole pair can be tapped at once.
        await card(pair(0)[0]).click();
        await card(pair(0)[1]).click();
        await expect(page.getByText("Pary: 1 z 6")).toBeVisible();
        await expect(card(pair(0)[0])).toBeDisabled();

        for (let value = 1; value < 6; value++) {
            await card(pair(value)[0]).click();
            await card(pair(value)[1]).click();
        }
        await expect(page.getByRole("heading", {name: /Wygrana/})).toBeVisible();
        await expect(page.getByText("Pomyłki: 1.")).toBeVisible();
    });

    test("the sliding puzzle moves tiles by tapping and by keys", async ({page}, testInfo) => {
        await register(page, uniquePlayer(testInfo.project.name));
        // Two tiles from the solution: 1 2 3 / 4 5 6 / _ 7 8
        const game = await serveGame(page, {game: "sliding_puzzle", difficulty: "easy"}, (state) => ({
            ...state,
            tiles: [1, 2, 3, 4, 5, 6, 0, 7, 8],
        }));
        await page.goto("/minigame");
        await expect(page.getByText("Ruchy: 0")).toBeVisible();

        // Numbers are an optional help.
        await expect(page.getByRole("button", {name: "Kafelek 7"})).toHaveText("");
        await page.getByRole("button", {name: "Numery"}).click();
        await expect(page.getByRole("button", {name: "Kafelek 7"})).toHaveText("7");

        // A tile away from the gap's line does not move.
        await page.getByRole("button", {name: "Kafelek 2"}).click();
        await expect(page.getByText("Ruchy: 0")).toBeVisible();

        // Tapping the far tile of the gap's row slides both, which here finishes the game.
        await page.getByRole("button", {name: "Kafelek 8"}).click();
        await expect(page.getByRole("heading", {name: /Wygrana/})).toBeVisible();
        await expect(page.getByText("Ruchy: 2.")).toBeVisible();
        expect((game.current() as PuzzleState).moves).toBe(2);
        expect((game.current() as PuzzleState).tiles).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
        await expect(page.getByRole("img", {name: /^Karta: /})).toBeVisible();
    });

    test("arrow keys move tiles", async ({page}, testInfo) => {
        await register(page, uniquePlayer(testInfo.project.name));
        const game = await serveGame(page, {game: "sliding_puzzle", difficulty: "easy"}, (state) => ({
            ...state,
            tiles: [1, 2, 3, 4, 5, 6, 0, 7, 8],
        }));
        await page.goto("/minigame");
        await expect(page.getByText("Ruchy: 0")).toBeVisible();
        // The gap is in the bottom left corner, so tile 4 comes down into it.
        await page.keyboard.press("ArrowDown");
        await expect.poll(() => (game.current() as PuzzleState).tiles[6]).toBe(4);
        await page.keyboard.press("ArrowUp");
        await page.keyboard.press("ArrowLeft");
        await expect.poll(() => (game.current() as PuzzleState).tiles[6]).toBe(7);
        await expect(page.getByText("Ruchy: 3")).toBeVisible();
    });

    test("a rejected puzzle move restores the board from the server", async ({page}, testInfo) => {
        await register(page, uniquePlayer(testInfo.project.name));
        await serveGame(page, {game: "sliding_puzzle", difficulty: "easy"}, (state) => ({
            ...state,
            tiles: [1, 2, 3, 4, 5, 6, 0, 7, 8],
        }));
        await page.goto("/minigame");
        await page.route("**/api/minigame/action", (route) =>
            route.fulfill({
                status: 409,
                json: {error: {code: "illegal_move", message: "Ten ruch jest niedozwolony"}},
            }),
        );
        await page.getByRole("button", {name: "Kafelek 7"}).click();
        await expect(page.getByText("Ten ruch jest niedozwolony")).toBeVisible();
        await expect(page.getByText("Ruchy: 0")).toBeVisible();
    });

    test("every game fits a 360 px screen with large enough targets", async ({page}, testInfo) => {
        test.skip(testInfo.project.name !== "desktop", "The size is set here, so one project is enough");
        await page.setViewportSize({width: 360, height: 640});
        await register(page, uniquePlayer(testInfo.project.name));

        const variants: [MinigameVariant, string][] = [
            [{game: "memory", difficulty: "hard"}, "Karta 1"],
            [{game: "sliding_puzzle", difficulty: "hard"}, "Kafelek 1"],
        ];
        for (const [variant, target] of variants) {
            await page.unrouteAll();
            await serveGame(page, variant);
            await page.goto("/minigame");
            const button = page.getByRole("button", {name: new RegExp(`^${target}\\b`)});
            await expect(button).toBeVisible();
            const box = await button.boundingBox();
            expect(box?.width).toBeGreaterThanOrEqual(44);
            expect(box?.height).toBeGreaterThanOrEqual(44);
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );
            expect(overflow).toBeLessThanOrEqual(0);
        }

        await page.unrouteAll();
        await page.goto("/");
        await expect(page.getByRole("region", {name: "Zadania dnia"}).getByRole("listitem")).toHaveCount(3);
        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
    });

    for (const theme of ["light", "dark"] as const) {
        test(`the games pass the accessibility check in the ${theme} theme`, async ({page}, testInfo) => {
            test.skip(testInfo.project.name !== "desktop", "Same markup on both projects");
            test.slow();
            await page.emulateMedia({reducedMotion: "reduce"});
            await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
            await register(page, uniquePlayer(testInfo.project.name));

            const variants: MinigameVariant[] = [
                {game: "who_is_it", difficulty: "easy"},
                {game: "who_is_it", difficulty: "hard"},
                {game: "memory", difficulty: "hard"},
                {game: "sliding_puzzle", difficulty: "easy"},
            ];
            for (const variant of variants) {
                await page.unrouteAll();
                await serveGame(page, variant);
                await page.goto("/minigame");
                await expect(page.getByText(/^Poziom /)).toBeVisible();
                await expectNoViolations(page, `${variant.game} ${variant.difficulty}`);
            }

            // A finished game.
            await page.unrouteAll();
            await serveGame(page, {game: "sliding_puzzle", difficulty: "easy"}, (state) => ({
                ...state,
                tiles: [1, 2, 3, 4, 5, 6, 7, 0, 8],
            }));
            await page.goto("/minigame");
            await page.getByRole("button", {name: "Kafelek 8"}).click();
            await expect(page.getByRole("heading", {name: /Wygrana/})).toBeVisible();
            await expectNoViolations(page, "finished game");
        });
    }
});
