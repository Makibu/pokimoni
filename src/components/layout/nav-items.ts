import {BookMarked, ChartNoAxesCombined, Home, ShoppingBag, Trophy, type LucideIcon} from "lucide-react";

export type NavItem = {label: string; href: string; icon: LucideIcon};

export const NAV_ITEMS: NavItem[] = [
    {label: "Start", href: "/", icon: Home},
    {label: "Sklep", href: "/shop", icon: ShoppingBag},
    {label: "Kolekcja", href: "/collection", icon: BookMarked},
    {label: "Osiągnięcia", href: "/achievements", icon: Trophy},
    {label: "Statystyki", href: "/statistics", icon: ChartNoAxesCombined},
];

export function isActiveLink(pathname: string, href: string): boolean {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
