import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

function generateMinesweeperBoard(width: number, height: number, mines: number) {
    const centerR = Math.floor(height / 2);
    const centerC = Math.floor(width / 2);

    const safeCells = [
        [centerR, centerC],
        [centerR - 1, centerC],
        [centerR + 1, centerC],
        [centerR, centerC - 1],
        [centerR, centerC + 1],
    ];

    const board: (number | "B")[][] = Array.from({length: height}, () => Array.from({length: width}, () => 0));

    let placed = 0;
    while (placed < mines) {
        const r = Math.floor(Math.random() * height);
        const c = Math.floor(Math.random() * width);

        if (board[r][c] === "B") continue;
        if (safeCells.some(([sr, sc]) => sr === r && sc === c)) continue;

        board[r][c] = "B";
        placed++;
    }

    const dirs = [-1, 0, 1];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (board[y][x] === "B") continue;
            let count = 0;
            dirs.forEach((dy) =>
                dirs.forEach((dx) => {
                    if (dy === 0 && dx === 0) return;
                    const ny = y + dy,
                        nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width && board[ny][nx] === "B") count++;
                }),
            );
            board[y][x] = count;
        }
    }

    const sideCells = [
        [centerR - 1, centerC],
        [centerR + 1, centerC],
        [centerR, centerC - 1],
        [centerR, centerC + 1],
    ];

    sideCells.forEach(([r, c]) => {
        if (board[r][c] === 0) {
            const potentialBombs: [number, number][] = [];
            dirs.forEach((dy) =>
                dirs.forEach((dx) => {
                    if (dy === 0 && dx === 0) return;
                    const nr = r + dy;
                    const nc = c + dx;
                    if (
                        nr >= 0 &&
                        nr < height &&
                        nc >= 0 &&
                        nc < width &&
                        board[nr][nc] !== "B" &&
                        !safeCells.some(([sr, sc]) => sr === nr && sc === nc)
                    ) {
                        potentialBombs.push([nr, nc]);
                    }
                }),
            );
            if (potentialBombs.length > 0) {
                const [br, bc] = potentialBombs[Math.floor(Math.random() * potentialBombs.length)];
                board[br][bc] = "B";
            }
        }
    });

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (board[y][x] === "B") continue;
            let count = 0;
            dirs.forEach((dy) =>
                dirs.forEach((dx) => {
                    if (dy === 0 && dx === 0) return;
                    const ny = y + dy,
                        nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width && board[ny][nx] === "B") count++;
                }),
            );
            board[y][x] = count;
        }
    }

    board[centerR][centerC] = 0;

    const finalBoard = board.map((row, r) =>
        row.map((cell, c) => ({
            value: cell,
            revealed: safeCells.some(([sr, sc]) => sr === r && sc === c),
        })),
    );

    return finalBoard;
}

export async function GET() {
    const {data} = await supabaseServer.from("daily_minesweeper").select("*").single();

    if (data) return NextResponse.json({minesweeper: data});

    const difficulties = [
        {name: "easy", width: 7, height: 7, mines: 10},
        {name: "medium", width: 9, height: 9, mines: 20},
        {name: "hard", width: 13, height: 13, mines: 30},
    ];
    const random = difficulties[Math.floor(Math.random() * difficulties.length)];

    const board = generateMinesweeperBoard(random.width, random.height, random.mines);

    const {data: inserted, error: insertError} = await supabaseServer
        .from("daily_minesweeper")
        .insert([{board, difficulty: random.name}])
        .select()
        .single();

    if (insertError) return NextResponse.json({error: insertError.message}, {status: 500});

    return NextResponse.json({minesweeper: inserted});
}
