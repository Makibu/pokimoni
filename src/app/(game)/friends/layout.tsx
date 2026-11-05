import type {Metadata} from "next";

// The page is a client component, so its title lives here.
export const metadata: Metadata = {title: "Znajomi"};

export default function FriendsLayout({children}: {children: React.ReactNode}) {
    return children;
}
