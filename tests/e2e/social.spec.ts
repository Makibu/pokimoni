import {type Browser, type BrowserContextOptions, expect, type Page, test, type TestInfo} from "@playwright/test";
import {expectNoViolations, register, uniquePlayer} from "./helpers";

type Player = {page: Page; username: string};

async function newPlayer(browser: Browser, testInfo: TestInfo, viewport?: {width: number; height: number}) {
    const context = await browser.newContext({
        ...(testInfo.project.use as BrowserContextOptions),
        ...(viewport ? {viewport} : {}),
    });
    const page = await context.newPage();
    const player = uniquePlayer(testInfo.project.name);
    await register(page, player);
    return {page, username: player.username};
}

/** Cards through the API: the ritual of opening a pack has its own tests. Different sets give different cards. */
async function openPack(page: Page, setIndex: number) {
    await page.evaluate(async (index) => {
        const shop = await (await fetch("/api/shop")).json();
        const set = shop.sets.filter((entry: {tier: number}) => entry.tier === 1)[index];
        await fetch("/api/packs/open", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({setId: set.id, source: "shop"}),
        });
    }, setIndex);
}

async function ownedCards(page: Page) {
    return page.evaluate(
        async () =>
            (await (await fetch("/api/collection/owned")).json()) as {id: string; name: string; escrowed: number}[],
    );
}

/** One player finds the other by nick, whatever its case, and invites them from the friends page. */
async function invite(from: Player, to: Player) {
    await from.page.goto("/friends");
    await from.page.getByLabel("Nick gracza").fill(to.username.toLowerCase());
    await from.page.getByRole("button", {name: "Szukaj"}).click();
    await from.page.getByRole("button", {name: "Zaproś", exact: true}).click();
    await expect(from.page.getByRole("button", {name: "Wycofaj", exact: true})).toBeVisible();
}

async function openInbox(page: Page) {
    await page.getByRole("button", {name: /^Skrzynka/}).click();
    await expect(page.getByRole("dialog", {name: "Skrzynka"})).toBeVisible();
}

async function closeDialog(page: Page) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
}

async function becomeFriends(a: Player, b: Player) {
    await invite(a, b);
    await b.page.goto("/");
    await openInbox(b.page);
    await b.page.getByRole("button", {name: "Przyjmij"}).click();
    await expect(b.page.getByRole("button", {name: "Przyjmij"})).toBeHidden();
    await closeDialog(b.page);
}

/** Sends an offer of the first free card for the friend's first free card. */
async function sendOffer(from: Player) {
    await from.page.goto("/friends");
    await from.page.getByRole("button", {name: "Wymień się"}).click();
    const dialog = from.page.getByRole("dialog");
    const cards = dialog.getByTestId("trade-cards").getByRole("button");
    await cards.first().click();
    await expect(dialog.getByRole("button", {name: "Otrzymujesz"})).toHaveAttribute("aria-pressed", "true");
    await cards.first().click();
    await dialog.getByRole("button", {name: "Wyślij ofertę"}).click();
    await expect(dialog).toBeHidden();
}

test("an invitation by nick leads to a finished trade between two players", async ({browser}, testInfo) => {
    test.slow();
    const a = await newPlayer(browser, testInfo);
    const b = await newPlayer(browser, testInfo);
    await openPack(a.page, 0);
    await openPack(b.page, 1);
    const cardsOfA = await ownedCards(a.page);
    const cardsOfB = await ownedCards(b.page);

    await b.page.goto("/");
    await expect(b.page.getByRole("button", {name: "Skrzynka", exact: true})).toBeVisible();
    await invite(a, b);

    // Entering another page shows the invitation with the red dot, and opening the inbox clears it.
    await b.page.getByRole("navigation", {name: "Główna"}).getByRole("link", {name: "Sklep"}).click();
    await expect(b.page.getByTestId("inbox-dot")).toBeVisible();
    await openInbox(b.page);
    await expect(b.page.getByText("zaprasza Cię do znajomych")).toBeVisible();
    await expect(b.page.getByTestId("inbox-dot")).toBeHidden();
    await b.page.getByRole("button", {name: "Przyjmij"}).click();
    await expect(b.page.getByRole("button", {name: "Przyjmij"})).toBeHidden();
    await closeDialog(b.page);

    await a.page.goto("/friends");
    await expect(a.page.getByRole("button", {name: "Wymień się"})).toBeVisible();
    await expect(a.page.getByTestId("inbox-dot")).toBeVisible();

    await sendOffer(a);

    // The offered copy waits: the sender sees it held, and the offer can be seen on the friends page.
    await expect(a.page.getByRole("button", {name: "Wycofaj ofertę"})).toBeVisible();
    await expect(a.page.getByRole("button", {name: "Oferta wysłana"})).toBeDisabled();
    expect((await ownedCards(a.page)).filter((card) => card.escrowed > 0)).toHaveLength(1);

    await b.page.goto("/");
    await openInbox(b.page);
    await expect(b.page.getByText("proponuje wymianę")).toBeVisible();
    await b.page.getByRole("button", {name: "Akceptuj"}).click();
    await expect(b.page.getByText("Wymiana gotowa", {exact: true})).toBeVisible();
    await closeDialog(b.page);

    const offered = (await ownedCards(a.page)).length;
    expect(offered).toBeGreaterThan(0);
    const namesOfB = (await ownedCards(b.page)).map((card) => card.id);
    expect(namesOfB.some((id) => cardsOfA.some((card) => card.id === id))).toBe(true);
    const namesOfA = (await ownedCards(a.page)).map((card) => card.id);
    expect(namesOfA.some((id) => cardsOfB.some((card) => card.id === id))).toBe(true);

    await a.page.goto("/");
    await openInbox(a.page);
    await expect(a.page.getByText("przyjmuje Twoją ofertę wymiany")).toBeVisible();
});

test("the red dot appears within about 30 seconds without leaving the page", async ({browser}, testInfo) => {
    const a = await newPlayer(browser, testInfo);
    const b = await newPlayer(browser, testInfo);
    await b.page.clock.install();
    await b.page.goto("/");
    await expect(b.page.getByRole("button", {name: "Skrzynka", exact: true})).toBeVisible();

    await invite(a, b);
    await expect(b.page.getByTestId("inbox-dot")).toBeHidden();

    await b.page.clock.fastForward(31_000);
    await expect(b.page.getByTestId("inbox-dot")).toBeVisible();
});

test("the profile editor reopens with what was just saved", async ({browser}, testInfo) => {
    const a = await newPlayer(browser, testInfo);
    await a.page.getByRole("button", {name: "Menu użytkownika"}).click();
    await a.page.getByRole("menuitem", {name: "Mój profil"}).click();
    const dialog = a.page.getByRole("dialog");

    await dialog.getByRole("button", {name: "Edytuj profil"}).click();
    await dialog.getByRole("button", {name: "Osiągnięcia"}).click();
    await dialog.getByRole("button", {name: "Zapisz profil"}).click();
    await dialog.getByRole("button", {name: "Edytuj profil"}).click();

    await expect(dialog.getByRole("button", {name: "Otwarte paczki"})).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("button", {name: "Osiągnięcia"})).toHaveAttribute("aria-pressed", "false");
});

test("a held card is marked in the collection and cannot go into a slot", async ({browser}, testInfo) => {
    const a = await newPlayer(browser, testInfo);
    const b = await newPlayer(browser, testInfo);
    await openPack(a.page, 0);
    await openPack(b.page, 1);
    await becomeFriends(a, b);
    const before = await ownedCards(a.page);
    await sendOffer(a);
    const held = (await ownedCards(a.page)).find((card) => card.escrowed > 0);
    expect(held).toBeTruthy();

    const setId = held!.id.split("-")[0];
    await a.page.goto(`/collection/${setId}`);
    await expect(a.page.getByText("W ofercie")).toHaveCount(1);

    await a.page.goto("/");
    await a.page.getByRole("button", {name: /Slot na kartę 1/}).click();
    const picker = a.page.getByRole("dialog");
    await expect(picker.getByRole("button", {name: /./}).first()).toBeVisible();
    const copiesOfHeld = before.filter((card) => card.name === held!.name).length;
    await expect(picker.getByText(held!.name, {exact: true})).toHaveCount(copiesOfHeld - 1);
});

test("a rejected or withdrawn offer gives the held copy back", async ({browser}, testInfo) => {
    test.slow();
    const a = await newPlayer(browser, testInfo);
    const b = await newPlayer(browser, testInfo);
    await openPack(a.page, 0);
    await openPack(b.page, 1);
    await becomeFriends(a, b);

    await sendOffer(a);
    expect((await ownedCards(a.page)).filter((card) => card.escrowed > 0)).toHaveLength(1);
    await a.page.getByRole("button", {name: "Wycofaj ofertę"}).click();
    await expect(a.page.getByRole("button", {name: "Wycofaj ofertę"})).toBeHidden();
    await expect.poll(async () => (await ownedCards(a.page)).filter((card) => card.escrowed > 0)).toHaveLength(0);

    await sendOffer(a);
    await b.page.goto("/friends");
    await b.page.getByRole("button", {name: "Odrzuć"}).click();
    await expect(b.page.getByRole("button", {name: "Odrzuć"})).toBeHidden();
    await expect.poll(async () => (await ownedCards(a.page)).filter((card) => card.escrowed > 0)).toHaveLength(0);

    await a.page.goto("/");
    await openInbox(a.page);
    await expect(a.page.getByText("odrzuca Twoją ofertę wymiany")).toBeVisible();
});

test("a profile shows the chosen statistics and showcase to other players, without the email", async ({
    browser,
}, testInfo) => {
    test.slow();
    const a = await newPlayer(browser, testInfo);
    const b = await newPlayer(browser, testInfo);
    await openPack(a.page, 0);

    await a.page.goto("/");
    await a.page.getByRole("button", {name: "Menu użytkownika"}).click();
    await a.page.getByRole("menuitem", {name: "Mój profil"}).click();
    const own = a.page.getByRole("dialog");
    await own.getByRole("button", {name: "Edytuj profil"}).click();
    // Three are already chosen by default, so a fourth has to wait for a free place.
    await expect(own.getByRole("button", {name: "Dni w grze"})).toBeDisabled();
    await own.getByRole("button", {name: "Osiągnięcia"}).click();
    await own.getByRole("button", {name: "Dni w grze"}).click();
    await expect(own.getByRole("button", {name: "Dni w grze"})).toHaveAttribute("aria-pressed", "true");
    await own.getByTestId("showcase-picker").getByRole("button").first().click();
    await own.getByRole("button", {name: "Zapisz profil"}).click();
    await expect(own.getByText("Dni w grze")).toBeVisible();
    await expect(own.getByTestId("showcase").getByRole("listitem")).toHaveCount(1);
    await closeDialog(a.page);

    await b.page.goto("/friends");
    await b.page.getByLabel("Nick gracza").fill(a.username);
    await b.page.getByRole("button", {name: "Szukaj"}).click();
    await b.page.getByRole("list", {name: "Wyniki wyszukiwania"}).getByText(a.username).click();
    const seen = b.page.getByRole("dialog");
    await expect(seen.getByRole("heading", {name: a.username})).toBeVisible();
    await expect(seen.getByText("Dni w grze")).toBeVisible();
    await expect(seen.getByTestId("showcase").getByRole("listitem")).toHaveCount(1);
    await expect(seen.getByText("@example.com")).toHaveCount(0);

    // A trade needs a friendship, and the profile offers the next step.
    await expect(seen.getByRole("button", {name: "Zaproponuj wymianę"})).toHaveCount(0);
    await seen.getByRole("button", {name: "Zaproś do znajomych"}).click();
    await expect(seen.getByRole("button", {name: "Wycofaj zaproszenie"})).toBeVisible();
});

test("removing a friend from their profile ends the friendship and returns held cards", async ({browser}, testInfo) => {
    test.slow();
    const a = await newPlayer(browser, testInfo);
    const b = await newPlayer(browser, testInfo);
    await openPack(a.page, 0);
    await openPack(b.page, 1);
    await becomeFriends(a, b);
    await sendOffer(a);

    await a.page.getByRole("button", {name: b.username}).first().click();
    const profile = a.page.getByRole("dialog");
    await expect(profile.getByRole("button", {name: "Oferta już wysłana"})).toBeDisabled();
    await profile.getByRole("button", {name: "Usuń ze znajomych"}).click();
    await a.page.getByRole("alertdialog").getByRole("button", {name: "Usuń"}).click();
    await expect(profile.getByRole("button", {name: "Zaproś do znajomych"})).toBeVisible();
    await closeDialog(a.page);

    await expect(a.page.getByRole("button", {name: "Wycofaj ofertę"})).toBeHidden();
    await expect.poll(async () => (await ownedCards(a.page)).filter((card) => card.escrowed > 0)).toHaveLength(0);

    await b.page.goto("/");
    await openInbox(b.page);
    await expect(b.page.getByText("usuwa Cię ze znajomych")).toBeVisible();
});

test("social views fit a 360 px screen", async ({browser}, testInfo) => {
    test.slow();
    const small = {width: 360, height: 640};
    const a = await newPlayer(browser, testInfo, small);
    const b = await newPlayer(browser, testInfo, small);
    await openPack(a.page, 0);
    await openPack(b.page, 1);
    await becomeFriends(a, b);
    await sendOffer(a);

    const fitsScreen = (page: Page) =>
        page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    const dialogFitsScreen = (page: Page) =>
        page.getByRole("dialog").evaluate((dialog) => {
            const box = dialog.getBoundingClientRect();
            // Layout offsets, because the opening animation scales what the bounding boxes report.
            const contentEnd = dialog.clientWidth - parseFloat(getComputedStyle(dialog).paddingRight);
            const contentFits = [...dialog.children].every(
                (child) =>
                    getComputedStyle(child).position === "absolute" ||
                    (child as HTMLElement).offsetLeft + (child as HTMLElement).offsetWidth <= contentEnd + 1,
            );
            return box.left >= 0 && box.right <= window.innerWidth && box.bottom <= window.innerHeight && contentFits;
        });

    await a.page.goto("/friends");
    await expect(a.page.getByRole("button", {name: "Wycofaj ofertę"})).toBeVisible();
    expect(await fitsScreen(a.page)).toBe(true);

    await b.page.goto("/friends");
    await expect(b.page.getByRole("button", {name: "Akceptuj"})).toBeVisible();
    expect(await fitsScreen(b.page)).toBe(true);

    await openInbox(b.page);
    expect(await dialogFitsScreen(b.page)).toBe(true);
    await closeDialog(b.page);

    await b.page.getByRole("button", {name: "Wymień się"}).click();
    await expect(b.page.getByTestId("trade-cards")).toBeVisible();
    expect(await dialogFitsScreen(b.page)).toBe(true);
    await expect(b.page.getByRole("button", {name: "Wyślij ofertę"})).toBeInViewport();
    await closeDialog(b.page);

    await b.page.getByRole("button", {name: "Menu użytkownika"}).click();
    await b.page.getByRole("menuitem", {name: "Mój profil"}).click();
    const editProfile = b.page.getByRole("button", {name: "Edytuj profil"});
    await expect(editProfile).toBeVisible();
    expect(await dialogFitsScreen(b.page)).toBe(true);
    await editProfile.click();
    await expect(b.page.getByTestId("showcase-picker")).toBeVisible();
    expect(await dialogFitsScreen(b.page)).toBe(true);
});

for (const theme of ["light", "dark"] as const) {
    test(`social views pass the automated accessibility check in the ${theme} theme`, async ({browser}, testInfo) => {
        test.slow();
        const a = await newPlayer(browser, testInfo);
        const b = await newPlayer(browser, testInfo);
        for (const player of [a, b]) {
            await player.page.emulateMedia({reducedMotion: "reduce"});
            await player.page.evaluate((value) => localStorage.setItem("theme", value), theme);
        }
        await openPack(a.page, 0);
        await openPack(b.page, 1);
        await becomeFriends(a, b);
        await sendOffer(a);
        await expect(a.page.getByRole("button", {name: "Wycofaj ofertę"})).toBeVisible();
        await expectNoViolations(a.page, "friends page with an offer sent");

        await b.page.goto("/friends");
        await expect(b.page.getByRole("button", {name: "Akceptuj"})).toBeVisible();
        await expectNoViolations(b.page, "friends page with an offer received");

        await openInbox(b.page);
        await expect(b.page.getByText("proponuje wymianę")).toBeVisible();
        await expectNoViolations(b.page, "inbox");
        await closeDialog(b.page);

        await b.page.getByRole("button", {name: "Wymień się"}).click();
        await expect(b.page.getByTestId("trade-cards")).toBeVisible();
        await expectNoViolations(b.page, "trade window");
        await closeDialog(b.page);

        await b.page.getByRole("button", {name: a.username}).first().click();
        await expect(b.page.getByRole("button", {name: "Usuń ze znajomych"})).toBeVisible();
        await expectNoViolations(b.page, "profile");
        await closeDialog(b.page);

        await b.page.getByRole("button", {name: "Menu użytkownika"}).click();
        await b.page.getByRole("menuitem", {name: "Mój profil"}).click();
        await b.page.getByRole("button", {name: "Edytuj profil"}).click();
        await expect(b.page.getByTestId("showcase-picker")).toBeVisible();
        await expectNoViolations(b.page, "profile editor");
    });
}
