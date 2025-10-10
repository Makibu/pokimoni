"use client";

import {useEffect, useState} from "react";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import {useUserMinigames} from "@/hooks/queries/useUserMinigames";
import {useUserCoins} from "@/hooks/queries/useUserCoins";

type MinesweeperDialogProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

type BoardValue = number | "B";

type Cell = {
    value: BoardValue;
    revealed: boolean;
    flagged?: boolean;
};

type SavedState = {
    date: string;
    userBoard: Cell[][];
    lives: number;
};

export default function MinesweeperDialog({open, setOpen}: MinesweeperDialogProps) {
    const [board, setBoard] = useState<Cell[][]>([]);
    const [difficulty, setDifficulty] = useState("");
    const [gameOver, setGameOver] = useState(false);
    const [lives, setLives] = useState(2);
    const [flagMode, setFlagMode] = useState(false);
    const {updateGameFlag} = useUserMinigames();
    const {updateCoins} = useUserCoins();

    const STORAGE_KEY = "daily_minesweeper_state";

    const totalMines = board.flat().filter((cell) => cell.value === "B").length;
    const flaggedCount = board.flat().filter((cell) => cell.flagged).length;
    const remainingMines = totalMines - flaggedCount;

    async function getMinesweeper() {
        const res = await fetch("/api/daily-minesweeper");
        const json = await res.json();
        const minesweeper = json.minesweeper;

        const today = new Date().toISOString().split("T")[0];
        const saved = localStorage.getItem(STORAGE_KEY);
        let userBoard: Cell[][];
        let savedLives = 2;

        if (saved) {
            const parsed: SavedState = JSON.parse(saved);
            if (parsed.date === today) {
                userBoard = parsed.userBoard;
                savedLives = parsed.lives;
            } else {
                userBoard = minesweeper.board.map((row: Cell[]) =>
                    row.map((cell: Cell) => ({value: cell.value, revealed: cell.revealed, flagged: false}))
                );
            }
        } else {
            userBoard = minesweeper.board.map((row: Cell[]) =>
                row.map((cell: Cell) => ({value: cell.value, revealed: cell.revealed, flagged: false}))
            );
        }

        setBoard(userBoard);
        setDifficulty(minesweeper.difficulty);
        setLives(savedLives);
        setGameOver(false);

        saveState(userBoard, savedLives);
    }

    function revealCell(r: number, c: number) {
        if (gameOver) return;

        const newBoard = board.map((row) => row.map((cell) => ({...cell})));
        const clickedCell = newBoard[r][c];

        if (flagMode) {
            if (!clickedCell.revealed) {
                clickedCell.flagged = !clickedCell.flagged;
                setBoard(newBoard);
                saveState(newBoard, lives);
            }
        } else {
            if (clickedCell.value === "B") {
                if (lives > 1) {
                    setLives(lives - 1);
                    toast.error("💣 Trafiłeś na minę! Straciłeś życie!");
                    clickedCell.revealed = true;
                    clickedCell.flagged = true;
                } else {
                    setLives(0);
                    setGameOver(true);
                    updateGameFlag("minesweeper_flag")
                    toast.error("💥 Koniec gry!");
                    for (let i = 0; i < newBoard.length; i++) {
                        for (let j = 0; j < newBoard[i].length; j++) {
                            if (newBoard[i][j].value === "B") newBoard[i][j].revealed = true;
                        }
                    }
                }
            } else {
                const floodReveal = (row: number, col: number) => {
                    const cell = newBoard[row][col];
                    if (cell.revealed || cell.flagged) return;

                    cell.revealed = true;

                    if (cell.value === 0) {
                        const dirs = [-1, 0, 1];
                        dirs.forEach((dy) =>
                            dirs.forEach((dx) => {
                                if (dy === 0 && dx === 0) return;
                                const nr = row + dy;
                                const nc = col + dx;
                                if (nr >= 0 && nr < newBoard.length && nc >= 0 && nc < newBoard[0].length) {
                                    floodReveal(nr, nc);
                                }
                            })
                        );
                    }
                };

                floodReveal(r, c);
            }
        }

        setBoard(newBoard);
        saveState(newBoard, lives);

        checkWin(newBoard);
    }

    async function checkWin(currentBoard: Cell[][]) {
        const totalCells = currentBoard.length * currentBoard[0].length;
        const revealedAndFlagged = currentBoard.flat().filter((cell) => cell.revealed || cell.flagged).length;

        if (revealedAndFlagged === totalCells) {
            setGameOver(true);
            toast.success("🎉 Wygrałeś!");
            await updateGameFlag("minesweeper_flag")
            let reward = 0;
            if (difficulty === "easy") reward = 100;
            if (difficulty === "medium") reward = 250;
            if (difficulty === "hard") reward = 400;
            await updateCoins({type: "minigame", amount: reward});
            toast.success(`Gratulacje! Otrzymano ${reward} monet!`);
            setOpen(false);
        }
    }

    function saveState(userBoard: Cell[][], currentLives: number) {
        const today = new Date().toISOString().split("T")[0];
        localStorage.setItem(STORAGE_KEY, JSON.stringify({date: today, userBoard, lives: currentLives}));
    }

    useEffect(() => {
        if (open) getMinesweeper();
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-full md:w-[unset] flex flex-col">
                <DialogTitle></DialogTitle>
                <div className={'flex w-full gap-4 h-8'}>
                    {difficulty && (
                        <div
                            className="px-2 h-full flex items-center bg-gray-100 rounded-xl text-sm shadow-sm border-[1px]">
                            {difficulty}
                        </div>
                    )}
                    <div
                        className={`${flagMode ? "shadow-inner bg-gray-200" : "shadow-md bg-gray-100"} border-[1px] select-none border-2 aspect-square transition-all h-full rounded-md cursor-pointer grid place-items-center`}
                        onClick={() => setFlagMode(!flagMode)}>
                        🚩
                    </div>

                    <div className="ml-auto flex gap-1">
                        {[...Array(2)].map((_, i) => (
                            <span
                                key={i}
                                className={`text-red-500 text-xl transition-opacity duration-200 ${
                                    i >= lives ? "opacity-40" : ""
                                }`}
                            >
                                    ❤️
                                </span>
                        ))}
                    </div>

                    <div className="ml-2 font-bold text-lg">
                        Bomby: {remainingMines}
                    </div>

                </div>

                <div
                    className="grid gap-1"
                    style={{gridTemplateColumns: `repeat(${board[0]?.length || 0}, minmax(1.2rem, 2rem))`}}
                >
                    {board.map((row, r) =>
                        row.map((cell, c) => (
                            <div
                                key={`${r}-${c}`}
                                onClick={() => revealCell(r, c)}
                                className={`
          w-6 h-6 sm:w-8 sm:h-8
          flex items-center justify-center border text-sm sm:text-sm font-bold select-none cursor-pointer
          ${cell.revealed
                                    ? cell.value === "B"
                                        ? "bg-red-400 text-white"
                                        : "bg-gray-200"
                                    : "bg-gray-100 hover:bg-gray-300"}
        `}
                            >
                                {cell.revealed
                                    ? cell.value === "B"
                                        ? "💣"
                                        : cell.value === 0
                                            ? ""
                                            : cell.value
                                    : cell.flagged
                                        ? "🚩"
                                        : ""}
                            </div>
                        ))
                    )}
                </div>

            </DialogContent>
        </Dialog>
    );
}
