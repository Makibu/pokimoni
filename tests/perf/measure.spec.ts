import {writeFileSync} from "node:fs";
import {test, type CDPSession, type Page} from "@playwright/test";

// A mid-range phone on a slow connection, so differences between builds are visible.
const CPU_SLOWDOWN = 4;
const NETWORK = {offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750};
// Card art comes from an external host and would only add noise; first-party bytes are what we control.
const EXTERNAL_IMAGES = /images\.pokemontcg\.io|raw\.githubusercontent\.com/;

type Target = {route: string; content: string};

function trackTransfers(cdp: CDPSession) {
    const typeByRequest = new Map<string, string>();
    let bytes: Record<string, number> = {};
    cdp.on("Network.responseReceived", (event) => typeByRequest.set(event.requestId, event.type));
    cdp.on("Network.loadingFinished", (event) => {
        const type = (typeByRequest.get(event.requestId) ?? "Other").toLowerCase();
        bytes[type] = (bytes[type] ?? 0) + event.encodedDataLength;
    });
    return {
        reset: () => (bytes = {}),
        read: () => ({...bytes}),
    };
}

/** Milliseconds since navigation start until the text shows up on the page. */
async function contentTime(page: Page, content: string): Promise<number> {
    const handle = await page.waitForFunction(
        // textContent, because innerText skips off-screen tiles that use content-visibility.
        (text) =>
            document.querySelector("main")?.textContent?.toLowerCase().includes(text.toLowerCase()) &&
            performance.now(),
        content,
        {polling: 50, timeout: 120_000},
    );
    return Math.round((await handle.jsonValue()) as number);
}

async function paintTimes(page: Page) {
    return page.evaluate(
        () =>
            new Promise<{fcp: number; lcp: number}>((resolve) => {
                const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    resolve({fcp: Math.round(fcp), lcp: Math.round(entries[entries.length - 1]?.startTime ?? 0)});
                }).observe({type: "largest-contentful-paint", buffered: true});
                setTimeout(() => resolve({fcp: Math.round(fcp), lcp: 0}), 1000);
            }),
    );
}

test("measure loading speed", async ({page}) => {
    await page.route(EXTERNAL_IMAGES, (route) => route.abort());
    await page.setExtraHTTPHeaders({"x-forwarded-for": "10.99.99.99"});

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", NETWORK);
    await cdp.send("Emulation.setCPUThrottlingRate", {rate: CPU_SLOWDOWN});
    await cdp.send("Network.setCacheDisabled", {cacheDisabled: true});
    const transfers = trackTransfers(cdp);
    const results: Record<string, unknown>[] = [];

    async function measureColdLoad({route, content}: Target) {
        transfers.reset();
        await page.goto(route, {waitUntil: "commit"});
        const contentMs = await contentTime(page, content);
        await page.waitForLoadState("networkidle");
        const {fcp, lcp} = await paintTimes(page);
        const kb = Object.fromEntries(
            Object.entries(transfers.read()).map(([type, bytes]) => [type, Math.round(bytes / 1024)]),
        );
        results.push({kind: "cold", route, fcp, lcp, contentMs, kb});
    }

    await measureColdLoad({route: "/login", content: "Zaloguj"});

    // A player with some cards, created through the API so the same script works on any UI version.
    const suffix = Date.now().toString(36);
    const fixture = await page.evaluate(async (id) => {
        const post = (path: string, body: unknown) =>
            fetch(path, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
        await post("/api/auth/register", {
            username: `perf_${id}`,
            email: `perf_${id}@example.com`,
            password: "perf-password",
        });
        const shop = await (await fetch("/api/shop")).json();
        const cheapest = shop.sets.find((set: {tier: number}) => set.tier === 1);
        await post("/api/packs/open", {setId: cheapest.id, source: "shop"});
        const owned = await (await fetch("/api/collection/owned")).json();
        return {setId: cheapest.id as string, setName: cheapest.name as string, cardName: owned[0].name as string};
    }, suffix);

    const targets: Target[] = [
        {route: "/", content: "Skarbonka"},
        {route: "/shop", content: fixture.setName},
        {route: "/collection", content: fixture.setName},
        {route: `/collection/${fixture.setId}`, content: fixture.cardName},
        {route: "/friends", content: "Żadne zaproszenie"},
        {route: "/minigame", content: "Zacznij"},
        {route: "/achievements", content: "Nagroda"},
        {route: "/statistics", content: "Unikatowe"},
    ];

    for (const target of targets) await measureColdLoad(target);

    // In-app navigation with the browser cache on, as a player moves around once the app is loaded.
    await cdp.send("Network.setCacheDisabled", {cacheDisabled: false});
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    for (let round = 1; round <= 2; round++) {
        for (const {route, content} of targets.filter((target) => target.route.split("/").length === 2)) {
            if (route === "/") continue;
            const start = Date.now();
            await page.locator(`a[href="${route}"]:visible`).first().click();
            await page.waitForFunction(
                (text) => document.querySelector("main")?.textContent?.toLowerCase().includes(text.toLowerCase()),
                content,
                {polling: 50, timeout: 120_000},
            );
            results.push({kind: round === 1 ? "first-visit" : "return-visit", route, contentMs: Date.now() - start});
            await page.locator('a[href="/"]:visible').first().click();
            await page.waitForURL(/\/$/);
        }
    }

    console.table(results.map((row) => ({...row, kb: row.kb ? JSON.stringify(row.kb) : ""})));
    if (process.env.PERF_OUT) writeFileSync(process.env.PERF_OUT, JSON.stringify(results, null, 2));
});
