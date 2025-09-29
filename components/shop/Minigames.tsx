"use client"

import {Button} from "@/components/ui/button";
import {useState} from "react";
import SudokuDialog from "@/components/shop/SudokuDialog";
import {useUserMinigames} from "@/hooks/queries/useUserMinigames";

export default function Minigames({className}: { className: string }) {
    const [open, setOpen] = useState(false)

    const {sudokuAvailable} = useUserMinigames()
    console.log(sudokuAvailable)

    function handleOpenSudoku() {
        if (sudokuAvailable) return
        setOpen(true)
    }

    return (
        <div className={`${className} relative overflow-hidden`}>
            <div
                className={'absolute h-16 items-center justify-between px-6 w-full bottom-0 flex border-t-[1px] bg-white'}>
                <div className={'flex flex-col'}>
                    <h2 className={'text-xl font-semibold'}>Sudoku</h2>
                    <h4 className={'text-sm text-gray-500'}>Zagraj i zdobądź 300 coinsów!</h4>
                </div>
                <Button variant={"default"} className={'bg-blue-500 hover:bg-blue-600'} disabled={sudokuAvailable}
                        onClick={handleOpenSudoku}>Zagraj</Button>
            </div>
            <SudokuDialog open={open} setOpen={setOpen}/>
        </div>
    )
}