import {randomInt} from "node:crypto";
import type {Rng} from "@/domain/packs";

const RANGE = 2 ** 47;

/** Cryptographic RNG for game draws, so results cannot be predicted from earlier ones. */
export const secureRng: Rng = () => randomInt(RANGE) / RANGE;
