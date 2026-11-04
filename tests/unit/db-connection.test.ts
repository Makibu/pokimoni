import {parse} from "pg-connection-string";
import {describe, expect, it} from "vitest";
import {secureConnectionUrl} from "@/server/db/connection";

describe("secureConnectionUrl", () => {
    it("encrypts connections to a remote server", () => {
        const config = parse(secureConnectionUrl("postgresql://user:pass@pooler.example.com:6543/postgres"));

        expect(config.ssl).toEqual({rejectUnauthorized: false});
    });

    it("keeps an encoded password intact", () => {
        const config = parse(secureConnectionUrl("postgresql://user:p%40ss%2Fword@pooler.example.com:6543/postgres"));

        expect(config.password).toBe("p@ss/word");
        expect(config.host).toBe("pooler.example.com");
        expect(config.port).toBe("6543");
    });

    it.each(["localhost", "127.0.0.1"])("leaves a local server on %s unencrypted", (host) => {
        const url = `postgres://postgres:postgres@${host}:5544/postgres`;

        expect(secureConnectionUrl(url)).toBe(url);
    });

    it("respects sslmode already present in the URL", () => {
        const url = "postgres://postgres:postgres@db.example.com:5432/postgres?sslmode=disable";

        expect(secureConnectionUrl(url)).toBe(url);
    });
});
