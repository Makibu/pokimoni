"use client"

import {Button} from "@/components/ui/button";
import {useState} from "react";
import SudokuDialog from "@/components/shop/SudokuDialog";
import {useUserMinigames} from "@/hooks/queries/useUserMinigames";

export default function Minigames({className}: { className: string }) {
    const [open, setOpen] = useState(false)

    const {sudokuAvailable} = useUserMinigames()

    function handleOpenSudoku() {
        if (!sudokuAvailable) return
        setOpen(true)
    }

    return (
        <div className={`${className} relative overflow-hidden flex justify-center`}>
            <img src="/sudoku-img.jpg" alt="Sudoku" className={"absolute opacity-75"}
                 width={400}
                 height={400}/>
            <div
                className={'absolute h-16 items-center justify-between px-6 w-full bottom-0 flex border-t-[1px] bg-white'}>
                <div className={'flex flex-col'}>
                    <h2 className={'text-base md:text-xl font-semibold'}>Sudoku</h2>
                    <h4 className={'text-[12px] md:text-sm text-gray-500'}>Zagraj i zdobądź monety!</h4>
                </div>
                <Button variant={"default"} className={'bg-blue-500 hover:bg-blue-600'} disabled={!sudokuAvailable}
                        onClick={handleOpenSudoku}>Zagraj</Button>
            </div>
            <SudokuDialog open={open} setOpen={setOpen}/>
        </div>
    )
}