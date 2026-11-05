import type {Metadata} from "next";
import Link from "next/link";
import {buttonVariants} from "@/components/ui/button";

export const metadata: Metadata = {title: "Nie ma takiej strony"};

export default function NotFound() {
    return (
        <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="font-display text-5xl font-bold text-primary">404</p>
            <h1 className="font-display text-xl font-bold">Nie ma takiej strony</h1>
            <p className="text-muted-foreground">Ta strona nie istnieje albo została przeniesiona.</p>
            <Link href="/" className={buttonVariants()}>
                Wróć na start
            </Link>
        </main>
    );
}
