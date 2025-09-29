import React from "react";
import {CheckCircle, Gift, Star} from "lucide-react";
import {Progress} from "@/components/ui/progress";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";

const rarityColors = {
    Common: "bg-slate-100 text-slate-700 border-slate-300",
    Rare: "bg-blue-100 text-blue-700 border-blue-300",
    Epic: "bg-gradient-to-r from-blue-400 to-indigo-500 text-white border-blue-400",
}

const categoryColors = {
    Collection: "bg-blue-50 text-blue-700 border-blue-200",
    Rarity: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Time: "bg-green-50 text-green-700 border-green-200",
    Coin: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Special: "bg-pink-50 text-pink-700 border-pink-200",
}

const typeTranslation: Record<string, string> = {
    Collection: "Kolekcja",
    Rarity: "Rzadkość",
    Time: "Czas",
    Coin: "Monety",
    Special: "Specjalne"
};

export default function AchievementTile({title, description, rarity, type, amount, reward, isCompleted}: {
    title: string,
    description: string,
    rarity: string,
    type: string,
    amount: number,
    reward: string[],
    isCompleted: boolean,
}) {
    return (
        <div
            className={`group transition-all duration-300 hover:shadow-xl border-2 bg-white/90 backdrop-blur-sm overflow-hidden px-6 py-4 rounded-xl w-[400px] ${
                isCompleted
                    ? "border-blue-300 hover:border-blue-400 bg-blue-50/30"
                    : "border-slate-200 hover:border-blue-300"
            }`}
        >
            <div className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-3 rounded-full ${
                                isCompleted ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600"
                            }`}
                        >
                            <Star className="h-6 w-6"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                            <div className="flex gap-2 mt-1">
                                <Badge
                                    className={`text-xs ${categoryColors[type as keyof typeof categoryColors]}`}
                                >
                                    {typeTranslation[type]}
                                </Badge>
                                <Badge
                                    className={`text-xs ${rarityColors[rarity as keyof typeof rarityColors]}`}>
                                    {rarity}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    {isCompleted && <CheckCircle className="h-6 w-6 text-blue-500"/>}
                </div>
            </div>

            <div className="space-y-4 mt-6">
                <p className="text-slate-600 text-sm">{description}</p>

                {/* Progress Bar */}
                <div className="space-y-2 text-green-700">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium">Postęp</span>
                        <span className="font-bold">
                        0/{amount}
                      </span>
                    </div>
                    <Progress value={0.4} max={amount}
                              className="h-2 bg-green-500/20 [&_[data-slot=progress-indicator]]:bg-green-700"/>
                    <div
                        className="text-xs text-slate-500 text-right">{Math.round(0.4 / amount * 100)}%
                        ukończone
                    </div>
                </div>

                {/* Reward */}
                <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Gift className="h-4 w-4 text-blue-600"/>
                        <span className="text-sm font-medium text-blue-700">Nagroda</span>
                    </div>
                    <p className="text-sm text-slate-600">{...reward}</p>
                </div>

                {/* Action Button */}
                {isCompleted ? (
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" disabled>
                        <CheckCircle className="h-4 w-4 mr-2"/>
                        Ukończone
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full border-blue-200 hover:border-blue-300 hover:bg-blue-50 bg-transparent"
                        disabled
                    >
                        W trakcie...
                    </Button>
                )}
            </div>
        </div>
    )
}