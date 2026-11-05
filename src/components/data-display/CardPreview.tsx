"use client";

import CardFace from "@/components/data-display/CardFace";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {MAX_CARD_COPIES} from "@/domain/economy";

export type PreviewedCard = {
    name: string;
    rarity: string;
    income: number;
    imageSmall: string;
    imageLarge: string;
    copies: number;
    escrowed?: number;
    overLimit?: boolean;
};

function Fact({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-b py-2.5 last:border-b-0">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-right text-sm font-bold">{children}</dd>
        </div>
    );
}

export default function CardPreview({
    card,
    setName,
    onClose,
}: {
    card: PreviewedCard;
    setName: string;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{card.name}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                    <CardFace
                        name={card.name}
                        imageSmall={card.imageSmall}
                        imageLarge={card.imageLarge}
                        className="mx-auto w-full max-w-[min(18rem,calc(46svh*0.716))] rounded-[16px]"
                    />
                    <div className="flex flex-col gap-3">
                        <dl className="flex flex-col">
                            <Fact label="Rzadkość">
                                <span className="capitalize">{card.rarity}</span>
                            </Fact>
                            <Fact label="Zestaw">{setName}</Fact>
                            <Fact label="Dochód w slocie">+{card.income}/h</Fact>
                            <Fact label="Twoje egzemplarze">
                                {card.copies} z {MAX_CARD_COPIES}
                            </Fact>
                            {(card.escrowed ?? 0) > 0 && <Fact label="W ofercie wymiany">{card.escrowed}</Fact>}
                        </dl>
                        {card.overLimit && (
                            <p className="rounded-[14px] bg-secondary p-3 text-sm font-medium">
                                Masz już {MAX_CARD_COPIES} egzemplarzy tej karty, więc ten nie trafił do kolekcji.
                            </p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
