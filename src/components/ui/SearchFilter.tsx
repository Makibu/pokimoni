"use client";

import {Filter, Search} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Input} from "@/components/ui/input";

export function SearchFilter({value, onChange}: {value: string; onChange: (query: string) => void}) {
    return (
        <div className="relative min-w-0 flex-1 sm:max-w-80">
            <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
                type="search"
                aria-label="Szukaj karty"
                placeholder="Szukaj karty..."
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="rounded-full pl-10"
            />
        </div>
    );
}

const SORT_OPTIONS = [
    {value: "rarity-asc", label: "Rzadkość: od najczęstszych"},
    {value: "rarity-desc", label: "Rzadkość: od najrzadszych"},
    {value: "name-asc", label: "Nazwa: A–Z"},
    {value: "name-desc", label: "Nazwa: Z–A"},
    {value: "newest", label: "Od najnowszych"},
    {value: "oldest", label: "Od najstarszych"},
];

type CardFilterProps = {
    rarityList: string[];
    activeFilters: string[];
    setActiveFilters: (filters: string[]) => void;
    sort: string;
    setSort: (sort: string) => void;
    resetFilters: () => void;
    showOwnedOnly: boolean;
    setShowOwnedOnly: (value: boolean) => void;
};

export function CardFilter({
    rarityList,
    activeFilters,
    setActiveFilters,
    sort,
    setSort,
    resetFilters,
    showOwnedOnly,
    setShowOwnedOnly,
}: CardFilterProps) {
    const allSelected = activeFilters.length === rarityList.length;

    function toggleFilter(rarity: string) {
        setActiveFilters(
            activeFilters.includes(rarity)
                ? activeFilters.filter((active) => active !== rarity)
                : [...activeFilters, rarity],
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Filter aria-hidden="true" />
                    Filtry
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
                <DropdownMenuLabel>Sortowanie</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                    {SORT_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem
                            key={option.value}
                            value={option.value}
                            onSelect={(event) => event.preventDefault()}
                        >
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>Rzadkość</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                    checked={allSelected}
                    onCheckedChange={() => setActiveFilters(allSelected ? [] : rarityList)}
                    onSelect={(event) => event.preventDefault()}
                >
                    {allSelected ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
                </DropdownMenuCheckboxItem>
                {rarityList.map((rarity) => (
                    <DropdownMenuCheckboxItem
                        key={rarity}
                        checked={activeFilters.includes(rarity)}
                        onCheckedChange={() => toggleFilter(rarity)}
                        onSelect={(event) => event.preventDefault()}
                    >
                        <span className="capitalize">{rarity}</span>
                    </DropdownMenuCheckboxItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuCheckboxItem
                    checked={showOwnedOnly}
                    onCheckedChange={(checked) => setShowOwnedOnly(!!checked)}
                    onSelect={(event) => event.preventDefault()}
                >
                    Pokaż tylko zdobyte
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={(event) => event.preventDefault()} onClick={resetFilters}>
                    Resetuj filtry
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
