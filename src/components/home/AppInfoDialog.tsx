"use client";

import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {changeDate, changesData, version} from "@/lib/changesData";

const TYPE_TONES = {Added: "bg-lilac", Fixed: "bg-aqua", Design: "bg-pink"};

export default function AppInfoDialog({onClose}: {onClose: () => void}) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>Informacje o aplikacji</DialogTitle>
                </DialogHeader>

                <p className="font-display text-3xl font-bold text-accent-ink">{version}</p>

                <section className="flex flex-col gap-3">
                    <h3 className="font-bold">Najnowsze zmiany</h3>
                    {changesData.map((change) => (
                        <div key={change.type} className={`rounded-lg p-4 text-sm ${TYPE_TONES[change.type]}`}>
                            <p className="mb-1 font-bold">{change.title}</p>
                            <ul className="flex list-disc flex-col gap-1 pl-4">
                                {change.options.map((option) => (
                                    <li key={option}>{option}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>

                <p className="text-sm text-muted-foreground">Ostatnia aktualizacja: {changeDate}</p>
            </DialogContent>
        </Dialog>
    );
}
