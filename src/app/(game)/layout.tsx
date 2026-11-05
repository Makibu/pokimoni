import BottomNav from "@/components/layout/BottomNav";
import Header from "@/components/layout/Header";
import {SocialDialogsProvider} from "@/features/social/social-dialogs";

export default function GameLayout({children}: {children: React.ReactNode}) {
    return (
        <SocialDialogsProvider>
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-3 focus:font-bold"
            >
                Przejdź do treści
            </a>
            <Header />
            <main id="main" className="mx-auto w-full max-w-[1248px] px-4 pt-4 pb-28 md:px-6 lg:pt-6 lg:pb-12">
                {children}
            </main>
            <BottomNav />
        </SocialDialogsProvider>
    );
}
