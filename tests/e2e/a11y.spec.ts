import AxeBuilder from "@axe-core/playwright";
import {expect, test, type Page} from "@playwright/test";
import {register, uniquePlayer} from "./helpers";

async function expectNoViolations(page: Page, name: string) {
    const results = await new AxeBuilder({page})
        // Toasts are animating when the check runs, so their colours are caught halfway through a fade.
        .exclude("[data-sonner-toaster]")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
    const summary = results.violations.map((violation) => ({
        rule: violation.id,
        nodes: violation.nodes.slice(0, 5).map((node) => `${node.target.join(" ")}: ${node.failureSummary ?? ""}`),
    }));
    expect(summary, `Accessibility problems on ${name}`).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
    test(`pages pass the automated accessibility check in the ${theme} theme`, async ({page}, testInfo) => {
        test.slow();
        // Colours are only meaningful once dialogs have finished fading in.
        await page.emulateMedia({reducedMotion: "reduce"});

        await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
        await page.goto("/login");
        await expect(page.getByLabel("Email")).toBeVisible();
        await expectNoViolations(page, "/login");

        await register(page, uniquePlayer(testInfo.project.name));

        // Cards let the checks see filled states, not only empty ones.
        await page.goto("/shop");
        await page
            .getByRole("button", {name: /za 150 monet/})
            .first()
            .click();
        await page.getByRole("button", {name: /Otwórz za 150/}).click();
        await expect(page.getByTestId("opened-card")).toHaveCount(5);
        await expectNoViolations(page, "opened pack");
        await page.getByRole("button", {name: "Zamknij", exact: true}).first().click();

        const pages: [string, string][] = [
            ["/", "Skarbonka"],
            ["/shop", "Paczki po 150 monet"],
            ["/collection", "Twój indeks kart"],
            ["/achievements", "Odbierz nagrodę"],
            ["/statistics", "Unikatowe karty"],
        ];
        for (const [route, content] of pages) {
            await page.goto(route);
            await expect(page.getByText(content).first()).toBeVisible();
            await expectNoViolations(page, route);
        }

        await page.goto("/collection");
        await page.locator('a[href^="/collection/"]').first().click();
        await expect(page.getByRole("searchbox", {name: "Szukaj karty"})).toBeVisible();
        await expectNoViolations(page, "set page");

        await page.goto("/");
        await page.getByRole("button", {name: "Menu użytkownika"}).click();
        await page.getByRole("menuitem", {name: "Ustawienia"}).click();
        await expect(page.getByRole("button", {name: "Ciemny"})).toBeVisible();
        await expectNoViolations(page, "settings");
    });
}
