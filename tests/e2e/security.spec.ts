import {expect, test} from "@playwright/test";
import {register, uniquePlayer} from "./helpers";

test("responses carry the security headers", async ({request}) => {
    for (const path of ["/login", "/api/auth/me"]) {
        const headers = (await request.get(path, {maxRedirects: 0})).headers();
        expect(headers["x-content-type-options"], path).toBe("nosniff");
        expect(headers["x-frame-options"], path).toBe("DENY");
        expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
        expect(headers["cross-origin-opener-policy"], path).toBe("same-origin");
        const policy = headers["content-security-policy"];
        expect(policy, path).toContain("frame-ancestors 'none'");
        expect(policy, path).toContain("connect-src 'self'");
        expect(policy, path).not.toContain("unsafe-eval");
    }
});

test("the security policy blocks nothing while playing", async ({page}, testInfo) => {
    test.slow();
    await page.emulateMedia({reducedMotion: "reduce"});
    const blocked: string[] = [];
    await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (event) => {
            console.error(`CSP blocked ${event.blockedURI} by ${event.violatedDirective}`);
        });
    });
    page.on("console", (message) => {
        if (/Content Security Policy|CSP blocked/.test(message.text())) blocked.push(message.text());
    });

    await register(page, uniquePlayer(testInfo.project.name));
    await page.goto("/shop");
    await page
        .getByRole("button", {name: /za 150 monet/})
        .first()
        .click();
    await page.getByRole("button", {name: /Otwórz za 150/}).click();
    await page.getByTestId("pack").click();
    await page.getByRole("button", {name: "Pomiń"}).click();
    await expect(page.getByTestId("opened-card")).toHaveCount(5);
    await page.getByRole("button", {name: "Zamknij", exact: true}).first().click();

    for (const route of ["/", "/collection", "/achievements", "/statistics", "/friends", "/minigame"]) {
        await page.goto(route);
        await page.waitForLoadState("networkidle").catch(() => undefined);
    }
    expect(blocked).toEqual([]);
});

test("pages are titled, and the sign-in page can be shared", async ({page, request}, testInfo) => {
    await page.goto("/login");
    await expect(page).toHaveTitle("Zaloguj się · Pokimoni");
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toContain("opengraph-image");
    expect(await page.locator('meta[property="og:description"]').getAttribute("content")).toBeTruthy();
    const picture = await request.get(new URL(image!).pathname + new URL(image!).search);
    expect(picture.status()).toBe(200);
    expect(picture.headers()["content-type"]).toBe("image/png");

    await register(page, uniquePlayer(testInfo.project.name));
    await expect(page).toHaveTitle("Pokimoni");
    const titles: [string, string][] = [
        ["/shop", "Sklep"],
        ["/collection", "Kolekcja"],
        ["/friends", "Znajomi"],
        ["/achievements", "Osiągnięcia"],
        ["/statistics", "Statystyki"],
        ["/minigame", "Minigra dnia"],
    ];
    for (const [route, title] of titles) {
        await page.goto(route);
        await expect(page).toHaveTitle(`${title} · Pokimoni`);
    }
});

test("crawler files stay public", async ({request}) => {
    const robots = await request.get("/robots.txt", {maxRedirects: 0});
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Disallow: /");

    const sitemap = await request.get("/sitemap.xml", {maxRedirects: 0});
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("/login");
});
