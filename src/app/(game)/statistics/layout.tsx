import type {Metadata} from "next";

// The page is a client component, so its title lives here.
export const metadata: Metadata = {title: "Statystyki"};

export default function StatisticsLayout({children}: {children: React.ReactNode}) {
    return children;
}
