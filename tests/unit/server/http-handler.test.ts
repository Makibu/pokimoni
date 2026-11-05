import {DrizzleQueryError} from "drizzle-orm/errors";
import {NextRequest} from "next/server";
import {afterEach, describe, expect, it, vi} from "vitest";
import {route} from "@/server/http/handler";

const SECRET = "secret-password-hash";
const noContext = undefined as unknown;
const request = () => new NextRequest("http://localhost/api/test", {headers: {host: "localhost"}});

function failingWith(error: unknown) {
    return route(async () => {
        throw error;
    });
}

describe("unexpected errors", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function logged(spy: ReturnType<typeof vi.spyOn>) {
        return spy.mock.calls.flat().map(String).join(" ");
    }

    it("keeps query parameters and quoted rows out of the logs", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        const cause = Object.assign(new Error("null value violates a constraint"), {
            code: "23502",
            detail: `Failing row contains (${SECRET}).`,
        });
        const res = await failingWith(new DrizzleQueryError("insert into users", [SECRET], cause))(
            request(),
            noContext,
        );

        expect(res.status).toBe(500);
        expect(JSON.stringify(log.mock.calls)).not.toContain(SECRET);
        expect(logged(log)).toContain("23502");
    });

    it("logs other errors whole, and tells the client nothing about them", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        const res = await failingWith(new Error("the image host is down"))(request(), noContext);

        expect(res.status).toBe(500);
        expect(await res.text()).not.toContain("image host");
        expect(logged(log)).toContain("the image host is down");
    });
});
