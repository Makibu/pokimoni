"use client";

import {BugIcon, Info} from "lucide-react";
import dynamic from "next/dynamic";
import {useState} from "react";
import {Button} from "@/components/ui/button";

const FeedbackDialog = dynamic(() => import("@/components/home/FeedbackDialog"));
const AppInfoDialog = dynamic(() => import("@/components/home/AppInfoDialog"));

export default function HomeExtras() {
    const [open, setOpen] = useState<"feedback" | "info" | null>(null);

    return (
        <div className="flex flex-wrap justify-center gap-2 md:justify-end">
            <Button variant="ghost" aria-label="Zgłoś błąd lub pomysł" onClick={() => setOpen("feedback")}>
                <BugIcon aria-hidden="true" />
                Zgłoś błąd lub pomysł
            </Button>
            <Button variant="ghost" aria-label="Informacje o aplikacji" onClick={() => setOpen("info")}>
                <Info aria-hidden="true" />
                Informacje o aplikacji
            </Button>
            {open === "feedback" && <FeedbackDialog onClose={() => setOpen(null)} />}
            {open === "info" && <AppInfoDialog onClose={() => setOpen(null)} />}
        </div>
    );
}
