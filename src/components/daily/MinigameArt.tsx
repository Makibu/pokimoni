import type {CSSProperties} from "react";
import type {Minigame} from "@/domain/minigames";

// Chosen for bright art, from the catalog's own host. Decoration only: none of them hints at a player's answers
// more than any other card, and when the host does not answer the block simply stays plain.
const WHO_IS_IT_ART = "https://images.pokemontcg.io/sv8/238.png";
const MEMORY_ART = "https://images.pokemontcg.io/sv6/188.png";
const PUZZLE_ART = "https://images.pokemontcg.io/sv3pt5/170.png";

const artOf = (url: string): CSSProperties => ({backgroundImage: `url(${url})`});

const CARD = "aspect-[245/342] bg-cover";
const TILTED_CARD = `absolute top-1/2 right-[6%] h-[108%] -translate-y-1/2 rotate-6 ${CARD}`;

function WhoIsItArt() {
    return (
        <div className={`${TILTED_CARD} overflow-hidden rounded-2xl`}>
            <div className="absolute inset-0 scale-110 bg-cover saturate-150 blur-[5px]" style={artOf(WHO_IS_IT_ART)} />
            <span className="absolute inset-0 flex items-center justify-center font-display text-7xl font-bold text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.45)] lg:text-8xl">
                ?
            </span>
        </div>
    );
}

/** Face-up positions: one found pair among the backs. */
const MEMORY_FACES = new Set([1, 5]);

function MemoryArt() {
    return (
        <div className="absolute top-1/2 -right-[6%] grid w-[88%] -translate-y-1/2 -rotate-6 grid-cols-3 gap-1.5">
            {Array.from({length: 9}, (_, position) =>
                MEMORY_FACES.has(position) ? (
                    <div key={position} className={`${CARD} rounded-md`} style={artOf(MEMORY_ART)} />
                ) : (
                    <div
                        key={position}
                        className="aspect-[245/342] rounded-md border border-[#3b24b8] bg-(image:--card-back)"
                    />
                ),
            )}
        </div>
    );
}

/** Where each cell's piece of the picture comes from. Two pieces are swapped and one is out, as in a game. */
const PUZZLE_CELLS = [0, 1, 5, 3, 4, 2, 6, null, 8];

function PuzzleArt() {
    return (
        <div className={`${TILTED_CARD} grid grid-cols-3 grid-rows-3 gap-0.5 bg-none`}>
            {PUZZLE_CELLS.map((piece, cell) =>
                piece === null ? (
                    <div key={cell} className="rounded-sm bg-secondary" />
                ) : (
                    <div
                        key={cell}
                        className="rounded-sm"
                        style={{
                            ...artOf(PUZZLE_ART),
                            backgroundSize: "300% 300%",
                            backgroundPosition: `${(piece % 3) * 50}% ${Math.floor(piece / 3) * 50}%`,
                        }}
                    />
                ),
            )}
        </div>
    );
}

const ART: Record<Minigame, () => React.ReactNode> = {
    who_is_it: WhoIsItArt,
    memory: MemoryArt,
    sliding_puzzle: PuzzleArt,
};

/** A picture of the day's game behind the text. The text keeps to the solid part of the fade. */
export default function MinigameArt({game}: {game: Minigame}) {
    const Art = ART[game];
    return (
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-y-0 right-0 w-3/5">
                <Art />
            </div>
            <div className="absolute inset-0 bg-linear-to-r from-card from-55% to-transparent to-78%" />
        </div>
    );
}
