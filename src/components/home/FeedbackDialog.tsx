"use client";

import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Textarea} from "@/components/ui/input";
import {useSendFeedback} from "@/features/game/use-game";

export default function FeedbackDialog({onClose}: {onClose: () => void}) {
    const [text, setText] = useState("");
    const sendFeedback = useSendFeedback();

    function handleSubmit() {
        sendFeedback.mutate(text, {
            onSuccess: () => {
                toast.success("Wiadomość wysłana! Dziękujemy :D");
                onClose();
            },
            onError: (error) => toast.error(error.message),
        });
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Zgłoś błąd lub pomysł</DialogTitle>
                    <DialogDescription>
                        Masz jakiś pomysł na zmiany lub znalazłeś jakiś błąd? Zgłoś go nam, a my Cię nagrodzimy!
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    aria-label="Treść zgłoszenia"
                    rows={4}
                    placeholder="Opisz swój pomysł lub błąd..."
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                />
                <Button onClick={handleSubmit} disabled={!text.trim() || sendFeedback.isPending} className="w-fit">
                    Wyślij
                </Button>
            </DialogContent>
        </Dialog>
    );
}
