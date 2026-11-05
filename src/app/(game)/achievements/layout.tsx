import type {Metadata} from "next";

// The page is a client component, so its title lives here.
export const metadata: Metadata = {title: "Osiągnięcia"};

export default function AchievementsLayout({children}: {children: React.ReactNode}) {
    return children;
}
