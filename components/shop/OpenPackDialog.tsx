"use client";

import {Card, SetType} from "@/lib/type";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {useUserCoins} from "@/hooks/queries/useUserCoins";
import {toast} from "sonner";
import {useEffect, useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useUserCards} from "@/hooks/queries/useUserCards";
import {checkUserBadges} from "@/lib/checkUserBadges";
import {motion} from "framer-motion";
import {checkUserAchievements} from "@/lib/checkUserAchievements";

type OpenPackDialogProps = {
    open: boolean;
    set: SetType | null;
    price: number;
    setSelectedSetData: (set: SetType | null) => void;
    setOpen: (open: boolean) => void;
};

type RandomPacks = {
    isGodPack: boolean;
    pack: Card[];
};

type CardParametersType = {
    scale: number;
    x: number;
    left: number | string;
    rotateY: number;
};

export default function OpenPackDialog({open, set, price, setOpen}: OpenPackDialogProps) {
    const queryClient = useQueryClient();
    const {updateCoins} = useUserCoins();
    const {updateUserCards} = useUserCards();

    const [step, setStep] = useState<"start" | "revealing" | "final">("start");
    const [currentCards, setCurrentCards] = useState<RandomPacks | null>(null);
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
    const [uid, setUid] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const [parameters, setParameters] = useState<CardParametersType[]>(
        Array(5).fill({left: 0, x: 0, scale: 1, rotateY: 0})
    );
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [finalLayout, setFinalLayout] = useState<boolean>(false);

    useEffect(() => {
        const uid = JSON.parse(localStorage.getItem("user") || "{}").uid;
        setUid(uid);
    }, []);

    const {refetch} = useQuery({
        queryKey: ["generatedCards", set?.id],
        queryFn: async () => {
            const response = await fetch(`/api/cards/${set?.id}/random`);
            const data = await response.json();
            return data;
        },
        enabled: false,
    });

    async function handleOpenPack() {
        if (!set) return;
        setLoading(true);
        toast.success("Zakupiono paczkę!");

        try {
            await updateCoins({type: "purchase", amount: -price});
            setStep("revealing");

            const {data: newCards} = await refetch();
            setCurrentCards(newCards);

            updateUserCards({
                cards: newCards.pack.map((c: Card) => ({card_id: c.id, quantity: 1})),
                set_id: set?.id,
            });
            queryClient.invalidateQueries({queryKey: ["userSetStats"]});

            const freshStatsRes = await fetch(`/api/user/stats?uid=${uid}`);
            const freshStats = await freshStatsRes.json();

            const newlyEarnedBadges = await checkUserBadges(uid, freshStats.userStats, 0, "all");
            if (newlyEarnedBadges && newlyEarnedBadges.length > 0) {
                toast.success(`Zdobyłeś nowe odznaki: ${newlyEarnedBadges.map(b => b.name).join(", ")}`);
            }

            const newlyEarnedAchievements = await checkUserAchievements(uid, freshStats.userStats);
            if (newlyEarnedAchievements && newlyEarnedAchievements.length > 0) {
                toast.success(`Zdobyłeś nowe osiągnięcia: ${newlyEarnedAchievements.map(a => a.title).join(", ")}`);
            }
        } catch {
            toast.error("Coś poszło nie tak :O Spróbuj ponownie później");
        } finally {
            setLoading(false);
        }
    }

    function handleNext() {
        if (!parameters.length) return;

        if (step === "start") {
            handleOpenPack();
            return;
        }

        if (step === "final") {
            resetPack();
            return;
        }

        if (finalLayout) return;

        const nextIndex = activeIndex === null ? 0 : activeIndex + 1;
        const newParameters = [...parameters];
        const isLast = nextIndex >= parameters.length;

        if (!isLast) {
            if (activeIndex !== null) {
                newParameters[activeIndex] = {
                    ...newParameters[activeIndex],
                    left: "90%",
                    x: -100,
                    scale: 1,
                    rotateY: 180,
                };
            }

            newParameters[nextIndex] = {
                ...newParameters[nextIndex],
                left: "50%",
                x: -50,
                scale: 1.2,
                rotateY: 180,
            };

            setParameters(newParameters);
            setActiveIndex(nextIndex);
        } else {
            if (activeIndex !== null) {
                newParameters[activeIndex] = {
                    ...newParameters[activeIndex],
                    left: "90%",
                    x: -100,
                    scale: 1,
                    rotateY: 180,
                };
            }
            setParameters(newParameters);

            setTimeout(() => {
                const spread = 60;
                const middleIndex = Math.floor(parameters.length / 2);
                const finalParams = [...parameters].reverse().map((_, i) => ({
                    left: "50%",
                    x: (i - middleIndex) * spread - 50,
                    scale: 1,
                    rotateY: 180,
                }));
                setParameters(finalParams);
                setFinalLayout(true);
                setStep("final");
            }, 500);
        }
    }

    function resetPack() {
        setStep("start");
        setOpen(false);
        setActiveIndex(null);
        setFinalLayout(false);
        setSelectedCardIndex(null);
        setParameters(Array(5).fill({left: 0, x: 0, scale: 1, rotateY: 0}));
    }

    return (
        <Dialog open={open} onOpenChange={resetPack}>
            <DialogContent
                className="p-12 flex justify-center items-center flex-col"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogTitle/>

                {step === "start" && (
                    <div className="flex flex-col items-center justify-center gap-4 w-[900px] h-[500px] relative">
                        <h2 className="text-xl font-bold absolute top-0">Otwórz paczkę</h2>
                        <img src={set?.images?.logo} alt={set?.name}/>
                        <Button
                            onClick={handleNext}
                            className="absolute bottom-0"
                            disabled={loading}
                        >
                            {loading ? "Ładowanie..." : `${price} monet`}
                        </Button>
                    </div>
                )}

                {(step === "revealing" || step === "final") && (
                    <div className="w-[900px] h-[500px] flex relative justify-center items-center">
                        {parameters.map((param, i) => {
                            const isSelected = finalLayout && selectedCardIndex === i;
                            const zIndex = finalLayout ? parameters.length - 1 + i : i;

                            return (
                                <motion.div
                                    key={i}
                                    className={`absolute aspect-[300/418] w-48 perspective-1000 transform-style-preserve-3d ${
                                        finalLayout ? "cursor-pointer" : ""
                                    }`}
                                    style={{
                                        top: `calc(50% + ${i * 10}px)`,
                                        translateY: "-50%",
                                        zIndex: zIndex,
                                    }}
                                    animate={{
                                        left: param.left,
                                        x: param.left === "50%" ? param.x - 50 : param.x,
                                        y: isSelected ? -20 : 0,
                                        scale: isSelected ? 1.3 : param.scale,
                                        zIndex: isSelected ? 20 : 1,
                                        rotateY: param.rotateY,
                                    }}
                                    onClick={() => {
                                        if (!finalLayout) return;
                                        setSelectedCardIndex((prev) => (prev === i ? null : i));
                                    }}
                                    transition={{type: "spring", stiffness: 500, damping: 30}}
                                >
                                    {/* awers */}
                                    <div
                                        className="absolute w-full h-full backface-hidden rounded-md bg-green-500 border-2"/>
                                    {/* rewers */}
                                    <div
                                        className="absolute w-full h-full backface-hidden rotate-y-180 rounded-md border-2 overflow-hidden">
                                        {currentCards?.pack[i]?.images?.large && (
                                            <img
                                                src={currentCards.pack[i].images.large}
                                                alt={`Card ${i}`}
                                                className="w-full h-full object-cover rounded-md"
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}

                        <div className="bottom-0 absolute">
                            <Button onClick={handleNext}>
                                {step === "final" ? "Zamknij" : "Next"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
