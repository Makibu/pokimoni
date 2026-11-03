import {expect, test} from "@playwright/test";
import {PASSWORD, register, uniquePlayer} from "./helpers";

test("player can register, stay signed in, log out and log back in", async ({page}, testInfo) => {
    const player = uniquePlayer(testInfo.project.name);
    await register(page, player);

    // The session cookie cannot be read by scripts and nothing identifying is left in localStorage.
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "session")?.httpOnly).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem("auth_token"))).toBeNull();

    await page.reload();
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole("button", {name: "Menu użytkownika"}).click();
    await page.getByRole("menuitem", {name: "Wyloguj"}).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(player.email.toUpperCase());
    await page.getByLabel("Hasło").fill(PASSWORD);
    await page.getByRole("button", {name: "Zaloguj", exact: true}).click();
    await expect(page).toHaveURL(/\/$/);
});

test("wrong password shows an error and stays on the login page", async ({page}, testInfo) => {
    const player = uniquePlayer(testInfo.project.name);
    await register(page, player);
    await page.getByRole("button", {name: "Menu użytkownika"}).click();
    await page.getByRole("menuitem", {name: "Wyloguj"}).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(player.email);
    await page.getByLabel("Hasło").fill("zle-haslo-123");
    await page.getByRole("button", {name: "Zaloguj", exact: true}).click();
    await expect(page.getByText("Nieprawidłowy email lub hasło")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
});

test("a forged session cookie does not open the game", async ({page, context, baseURL}) => {
    await context.addCookies([{name: "session", value: "forged.token.value", url: baseURL!}]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
});

test("player can delete the account after confirming the password", async ({page}, testInfo) => {
    const player = uniquePlayer(testInfo.project.name);
    await register(page, player);

    await page.getByRole("button", {name: "Menu użytkownika"}).click();
    await page.getByRole("menuitem", {name: "Profil"}).click();
    await page.getByRole("button", {name: "Usuń konto"}).click();
    await page.getByLabel("Hasło", {exact: true}).fill(PASSWORD);
    await page.getByRole("alertdialog").getByRole("button", {name: "Usuń konto"}).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(player.email);
    await page.getByLabel("Hasło").fill(PASSWORD);
    await page.getByRole("button", {name: "Zaloguj", exact: true}).click();
    await expect(page.getByText("Nieprawidłowy email lub hasło")).toBeVisible();
});

test("changing the password signs out other sessions", async ({page, browser, baseURL}, testInfo) => {
    const player = uniquePlayer(testInfo.project.name);
    await register(page, player);

    const otherContext = await browser.newContext({baseURL});
    await otherContext.addCookies(await page.context().cookies());
    const otherPage = await otherContext.newPage();
    await otherPage.goto("/");
    await expect(otherPage).toHaveURL(/\/$/);

    await page.getByRole("button", {name: "Menu użytkownika"}).click();
    await page.getByRole("menuitem", {name: "Profil"}).click();
    await page.getByLabel("Nowe hasło").fill("zupelnie-nowe-haslo");
    await page.getByLabel("Potwierdź hasło").fill("zupelnie-nowe-haslo");
    await page.getByLabel("Obecne hasło").fill(PASSWORD);
    await page.getByRole("button", {name: "Zapisz zmiany"}).click();
    await expect(page.getByText("Profil zaktualizowany")).toBeVisible();

    await otherPage.reload();
    await expect(otherPage).toHaveURL(/\/login$/);
    await otherContext.close();
});
