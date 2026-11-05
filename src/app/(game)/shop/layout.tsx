import type {Metadata} from "next";

// The page is a client component, so its title lives here.
export const metadata: Metadata = {title: "Sklep"};

export default function ShopLayout({children}: {children: React.ReactNode}) {
    return children;
}
