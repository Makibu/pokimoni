"use client";

import {Button} from "@/components/ui/button";
import {useState} from "react";
import SudokuDialog from "@/components/shop/SudokuDialog";
import MinesweeperDialog from "@/components/shop/MinesweeperDialog";
import {useUserMinigames} from "@/hooks/queries/useUserMinigames";
import {ChevronLeftIcon, ChevronRightIcon} from "lucide-react";
import {AnimatePresence, motion} from "framer-motion";

export default function Minigames({className}: { className: string }) {
    const [openSudoku, setOpenSudoku] = useState(false);
    const [openMinesweeper, setOpenMinesweeper] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const {sudokuAvailable, minesweeperAvailable} = useUserMinigames();

    const minigames = [
        {
            name: "Sudoku",
            status: sudokuAvailable,
            open: openSudoku,
            setOpen: setOpenSudoku,
            component: SudokuDialog,
            image: "/sudoku-img.jpg",
        },
        {
            name: "Saper",
            status: minesweeperAvailable,
            open: openMinesweeper,
            setOpen: setOpenMinesweeper,
            component: MinesweeperDialog,
            image: "/minesweeper-img.jpeg",
        },
    ];

    const currentGame = minigames[currentIndex];
    const CurrentDialog = currentGame.component;

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + minigames.length) % minigames.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % minigames.length);
    };

    return (
        <div className={`${className} relative w-full flex justify-center items-center overflow-hidden`}>
            <AnimatePresence mode="wait">
                <motion.img
                    key={currentGame.name}
                    src={currentGame.image}
                    alt={currentGame.name}
                    className="absolute w-full h-full object-cover opacity-75"
                    initial={{opacity: 0, x: 50}}
                    animate={{opacity: 0.75, x: 0}}
                    exit={{opacity: 0, x: -50}}
                    transition={{duration: 0.5}}
                />
            </AnimatePresence>

            <div
                className="absolute bottom-0 w-full flex justify-between items-center px-6 h-20 bg-white border-t-[1px]">
                <div className="flex flex-col">
                    <h2 className="text-base md:text-xl font-semibold">{currentGame.name}</h2>
                    <h4 className="text-[12px] md:text-sm text-gray-500">Zagraj i zdobądź monety!</h4>
                </div>
                <Button
                    variant="default"
                    className="bg-blue-500 hover:bg-blue-600"
                    disabled={!currentGame.status}
                    onClick={() => currentGame.setOpen(true)}
                >
                    Zagraj
                </Button>
            </div>

            <div
                className="bg-white/85 hover:bg-gray-100 transition-all absolute left-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-blue-500 hover:text-blue-600 py-2 rounded-sm border-2 border-blue-400 hover:border-blue-500"
                onClick={handlePrev}
            >
                <ChevronLeftIcon/>
            </div>
            <div
                className="bg-white/85 hover:bg-gray-100 transition-all absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-blue-500 hover:text-blue-600 py-2 rounded-sm border-2 border-blue-400 hover:border-blue-500"
                onClick={handleNext}
            >
                <ChevronRightIcon/>
            </div>

            <CurrentDialog open={currentGame.open} setOpen={currentGame.setOpen}/>
        </div>
    );
}
