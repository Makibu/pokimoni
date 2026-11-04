import {expect, test} from "@playwright/test";
import {register, uniquePlayer} from "./helpers";

test("daily reward, buying a pack and seeing it in the collection", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));

    await page.goto("/shop");
    await page.getByRole("button", {name: "Odbierz 100 monet"}).click();
    await expect(page.getByRole("button", {name: "Odebrano!"})).toBeVisible();
    await expect(page.getByText("600", {exact: true}).first()).toBeVisible();

    // Buy the first pack of the cheapest tier.
    await page
        .getByRole("button", {name: /za 150 monet/})
        .first()
        .click();
    await page.getByRole("button", {name: /Otwórz za 150/}).click();
    await page.getByRole("button", {name: "Pomiń"}).click();
    await expect(page.getByTestId("opened-card")).toHaveCount(5);
    await expect(page.getByText("450", {exact: true}).first()).toBeVisible();
    await page.getByRole("button", {name: "Zamknij", exact: true}).first().click();

    // Refreshing keeps the state: nothing lives only in the browser.
    await page.reload();
    await expect(page.getByRole("button", {name: "Odebrano!"})).toBeVisible();
    await expect(page.getByText("450", {exact: true}).first()).toBeVisible();

    await page.goto("/statistics");
    await expect(page.getByText("Unikatowe Karty")).toBeVisible();

    await page.goto("/achievements");
    await page.getByRole("button", {name: "Odbierz nagrodę"}).first().click();
    await expect(page.getByText("Nagroda odebrana!")).toBeVisible();
    await expect(page.getByRole("button", {name: "Odebrane"}).first()).toBeVisible();
});

test("a card can be placed in an income slot and stays there", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));

    await page.goto("/shop");
    await page
        .getByRole("button", {name: /za 150 monet/})
        .first()
        .click();
    await page.getByRole("button", {name: /Otwórz za 150/}).click();
    await page.getByRole("button", {name: "Pomiń"}).click();
    await expect(page.getByTestId("opened-card")).toHaveCount(5);
    await page.getByRole("button", {name: "Zamknij", exact: true}).first().click();

    await page.goto("/");
    await page.getByRole("button", {name: "Slot na kartę 1"}).click();
    await page.getByRole("dialog").getByRole("button").first().click();
    await expect(page.getByRole("button", {name: /^Slot 1: /})).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", {name: /^Slot 1: /})).toBeVisible();
    await expect(page.getByText(/Skarbonka: 0 z 300/)).toBeVisible();

    // The card can be taken back out of the slot.
    await page.getByRole("button", {name: /^Slot 1: /}).click();
    await page.getByRole("button", {name: "Zdejmij kartę"}).click();
    await expect(page.getByRole("button", {name: "Slot na kartę 1"})).toBeVisible();
});

test("the daily reward and daily pack are also available on the home page", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));

    await page.getByRole("button", {name: "Odbierz 100 monet"}).click();
    await expect(page.getByRole("button", {name: "Odebrano!"})).toBeVisible();
    await expect(page.getByText("600", {exact: true}).first()).toBeVisible();

    await page.getByRole("button", {name: /Kup paczkę dnia/}).click();
    await page.getByRole("button", {name: /Otwórz za \d+/}).click();
    await page.getByRole("button", {name: "Pomiń"}).click();
    await expect(page.getByTestId("opened-card")).toHaveCount(5);
});

test("collection filters narrow the cards and can be reset", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));

    await page.goto("/collection");
    await page.locator('a[href^="/collection/"]').first().click();
    await expect(page.getByRole("searchbox", {name: "Szukaj karty"})).toBeVisible();
    const noMatch = page.getByText("Żadna karta nie pasuje do wybranych filtrów.");

    await page.getByRole("searchbox", {name: "Szukaj karty"}).fill("nie-ma-takiej-karty");
    await expect(noMatch).toBeVisible();
    await page.getByRole("button", {name: "Resetuj filtry"}).click();
    await expect(noMatch).toBeHidden();

    await page.getByRole("button", {name: "Filtry"}).click();
    await page.getByRole("menuitemcheckbox", {name: "Pokaż tylko zdobyte"}).click();
    await page.keyboard.press("Escape");
    await expect(noMatch).toBeVisible();
});

test("feedback can be sent from the home page", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));
    await page.getByLabel("Zgłoś błąd lub pomysł").click();
    await page.getByPlaceholder("Opisz swój pomysł lub błąd...").fill("Test zgłoszenia");
    await page.getByRole("button", {name: "Wyślij"}).click();
    await expect(page.getByText("Wiadomość wysłana! Dziękujemy :D")).toBeVisible();
});
