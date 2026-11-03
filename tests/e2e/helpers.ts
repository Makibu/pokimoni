import {expect, type Page} from "@playwright/test";

export const PASSWORD = "dowolne-haslo";

export function uniquePlayer(projectName: string) {
    const suffix = `${projectName.slice(0, 1)}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    return {username: `Gracz_${suffix}`, email: `gracz_${suffix}@example.com`};
}

const randomOctet = () => Math.floor(Math.random() * 250) + 1;

/** Registers through the UI. Each test acts as a separate client, so it does not share the per-IP limit. */
export async function register(page: Page, player: {username: string; email: string}) {
    await page.setExtraHTTPHeaders({"x-forwarded-for": `10.${randomOctet()}.${randomOctet()}.${randomOctet()}`});
    await page.goto("/login");
    await page.getByRole("button", {name: "Stwórz konto!"}).click();
    await page.getByLabel("Nazwa użytkownika").fill(player.username);
    await page.getByLabel("Email").fill(player.email);
    await page.getByLabel("Hasło").fill(PASSWORD);
    await page.getByRole("button", {name: "Zarejestruj", exact: true}).click();
    await expect(page).toHaveURL(/\/$/);
}
