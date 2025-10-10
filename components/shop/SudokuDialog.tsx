"use client"

import {useEffect, useMemo, useState} from "react";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {useUserCoins} from "@/hooks/queries/useUserCoins";
import {useUserMinigames} from "@/hooks/queries/useUserMinigames";
import {toast} from "sonner";

type SudokuDialogProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

type SavedSudokuState = {
    date: string;
    userBoard: string[][];
    selectedNumber: number | null;
};

export default function SudokuDialog({open, setOpen}: SudokuDialogProps) {
    const [board, setBoard] = useState<number[][]>([]);
    const [solution, setSolution] = useState<number[][]>([]);
    const [userBoard, setUserBoard] = useState<string[][]>([]);
    const [message, setMessage] = useState<string>("");
    const [difficulty, setDifficulty] = useState<string>("");
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    const [saved, setSaved] = useState<string | null>(null);

    const {updateCoins} = useUserCoins();
    const {updateSudokuFlag} = useUserMinigames();

    const STORAGE_KEY = "daily_sudoku_state";

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        setSaved(saved)
    }, []);

    async function getSudoku() {
        const data = await fetch("/api/daily-sudoku");
        const json = await data.json();
        const sudoku = json.sudoku;

        setBoard(sudoku.board);
        setSolution(sudoku.solution);
        setDifficulty(sudoku.difficulty);

        const today = new Date().toISOString().split("T")[0];

        if (saved) {
            const parsed: SavedSudokuState = JSON.parse(saved);
            if (parsed.date === today) {
                setUserBoard(parsed.userBoard);
                setSelectedNumber(parsed.selectedNumber);
            } else {
                setUserBoard(
                    sudoku.board.map((row: number[]) =>
                        row.map((cell: number) => (cell === 0 ? "" : cell.toString()))
                    )
                );
                setSelectedNumber(null);
            }
        } else {
            setUserBoard(
                sudoku.board.map((row: number[]) =>
                    row.map((cell: number) => (cell === 0 ? "" : cell.toString()))
                )
            );
            setSelectedNumber(null);
        }

        setMessage("");
    }

    useEffect(() => {
        if (userBoard.length === 0) return;

        const today = new Date().toISOString().split("T")[0];
        const saveState: SavedSudokuState = {
            date: today,
            userBoard,
            selectedNumber,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
    }, [userBoard, selectedNumber]);

    function handleChange(row: number, col: number, value: string) {
        if (/^[1-9]?$/.test(value)) {
            const updated = userBoard.map((r, rIdx) =>
                rIdx === row ? r.map((c, cIdx) => (cIdx === col ? value : c)) : r
            );
            setUserBoard(updated);
        }
    }

    async function checkSudoku() {
        const correct = userBoard.every((row, r) =>
            row.every((val, c) => val !== "" && parseInt(val) === solution[r][c])
        );

        if (correct) {
            let reward = 0;
            if (difficulty === "easy") reward = 100;
            if (difficulty === "medium") reward = 250;
            if (difficulty === "hard") reward = 400;

            await updateCoins({type: "minigame", amount: reward});
            await updateSudokuFlag();
            toast.success(`Gratulacje! Otrzymano ${reward} monet!`);
            setOpen(false)
        } else {
            setMessage("❌ Niestety, coś się nie zgadza.");
        }
    }

    function resetSudoku() {
        if (!board.length) return;

        const clearedBoard = board.map((row) =>
            row.map((cell) => (cell === 0 ? "" : cell.toString()))
        );

        setUserBoard(clearedBoard);
        setSelectedNumber(null);

        const today = new Date().toISOString().split("T")[0];
        const saveState = {
            date: today,
            userBoard: clearedBoard,
            selectedNumber: null,
        };
        localStorage.setItem("daily_sudoku_state", JSON.stringify(saveState));
    }

    useEffect(() => {
        if (open) getSudoku();
    }, [open]);

    const remainingCount = useMemo(() => {
        const counts: Record<number, number> = {};
        for (let i = 1; i <= 9; i++) counts[i] = 9;

        userBoard.forEach((row) =>
            row.forEach((val) => {
                const n = parseInt(val);
                if (!isNaN(n)) counts[n]--;
            })
        );
        return counts;
    }, [userBoard]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-full md:w-[unset] flex flex-col">
                <DialogTitle className="mb-4"></DialogTitle>

                <div className="flex space-x-6 items-start">
                    <div className="flex flex-col items-center space-y-4">
                        <div className={'flex w-full gap-4'}>
                            {difficulty && (
                                <div
                                    className="px-2 py-1 bg-gray-100 rounded-xl text-sm self-start shadow-sm border-[1px]">
                                    {difficulty}
                                </div>
                            )}
                            <div className="flex">
                                <button onClick={resetSudoku}
                                        className="px-2 py-1 bg-white rounded-xl text-sm self-start shadow-sm border-[1px] border-black cursor-pointer hover:bg-red-200 transition-colors duration-200">
                                    Resetuj Sudoku
                                </button>
                            </div>

                        </div>

                        <div className="grid grid-cols-9 gap-0">
                            {userBoard.map((row, r) =>
                                row.map((val, c) => {
                                    const isPrefilled = board[r][c] !== 0;
                                    const cellValue = parseInt(val);
                                    const isHighlighted =
                                        selectedNumber !== null && cellValue === selectedNumber;

                                    const borderClasses = `
                    border 
                    ${r % 3 === 0 ? "border-t-2 md:border-t-4 border-t-gray-400" : "border-t"}
                    ${c % 3 === 0 ? "border-l-2 md:border-l-4 border-l-gray-400" : "border-l"}
                    ${r === 8 ? "border-b-2 md:border-b-4 border-b-gray-400" : ""}
                    ${c === 8 ? "border-r-2 md:border-r-4 border-r-gray-400" : ""}
                  `;

                                    return (
                                        <input
                                            key={`${r}-${c}`}
                                            value={val}
                                            disabled={isPrefilled}
                                            onChange={(e) => handleChange(r, c, e.target.value)}
                                            className={`w-8 md:w-10 h-8 md:h-10 text-center text-lg ${borderClasses} 
                        ${isPrefilled ? "bg-gray-100 font-bold" : "bg-white"}
                        ${isHighlighted ? "bg-yellow-200" : ""}
                      `}
                                        />
                                    );
                                })
                            )}
                        </div>

                        <Button onClick={checkSudoku}>Sprawdź Sudoku</Button>
                        {message && <p className="mt-2 text-lg">{message}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {Array.from({length: 9}, (_, i) => i + 1).map((n) => {
                            const isSelected = selectedNumber === n;
                            return (
                                <div
                                    key={n}
                                    onClick={() =>
                                        setSelectedNumber(selectedNumber === n ? null : n)
                                    }
                                    className={`relative w-10 h-10 flex items-center justify-center rounded-md border shadow-sm cursor-pointer
                    ${isSelected ? "bg-yellow-300 border-yellow-500" : "bg-gray-100"}
                  `}
                                >
                                    <span className="text-lg font-bold">{n}</span>
                                    <span className="absolute top-0 right-0 text-xs bg-gray-300 rounded-full px-1">
                    {remainingCount[n]}
                  </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
