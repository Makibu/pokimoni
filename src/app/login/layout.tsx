import type {Metadata} from "next";

// The page is a client component, so its title lives here.
export const metadata: Metadata = {title: "Zaloguj się"};

export default function LoginLayout({children}: {children: React.ReactNode}) {
    return children;
}
