import type {Metadata} from "next";

// The pages are client components, so their title lives here.
export const metadata: Metadata = {title: "Kolekcja"};

export default function CollectionLayout({children}: {children: React.ReactNode}) {
    return children;
}
