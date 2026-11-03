"use client";

import {useState} from "react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {ArrowDown, ArrowUp, Filter} from "lucide-react";

type SearchFilterProps = {
    onSearch: (query: string) => void;
};

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

export function SearchFilter({onSearch}: SearchFilterProps) {
    const [value, setValue] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setValue(query);
        onSearch(query);
    };

    return (
        <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="Szukaj karty..."
            className="w-80 px-4 py-2 rounded-xl bg-white border-2 border-gray-400 shadow-md focus:outline-none"
        />
    );
}

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

    const toggleFilter = (rarity: string) => {
        if (activeFilters.includes(rarity)) {
            setActiveFilters(activeFilters.filter((r) => r !== rarity));
        } else {
            setActiveFilters([...activeFilters, rarity]);
        }
    };

    const toggleAll = () => {
        if (allSelected) {
            setActiveFilters([]);
        } else {
            setActiveFilters(rarityList);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-2" variant={"outline"}>
                    <Filter className="h-4 w-4" />
                    Filtry
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Sortowanie</DropdownMenuLabel>
                <div className="flex flex-col gap-2">
                    {/* Sortowanie rzadkość, nazwa, nowość */}
                    <div className="flex items-center relative px-6">
                        <span className="text-sm">Rzadkość</span>
                        <div className="absolute right-6 flex gap-1">
                            <Button
                                size={"icon"}
                                className="w-5 h-5"
                                onClick={() => setSort("rarity-asc")}
                                variant={sort === "rarity-asc" ? "default" : "outline"}
                            >
                                <ArrowUp className="scale-80" />
                            </Button>
                            <Button
                                size={"icon"}
                                className="w-5 h-5"
                                onClick={() => setSort("rarity-desc")}
                                variant={sort === "rarity-desc" ? "default" : "outline"}
                            >
                                <ArrowDown className="scale-80" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center relative px-6">
                        <span className="text-sm">Nazwa</span>
                        <div className="absolute right-6 flex gap-1">
                            <Button
                                size="icon"
                                className="w-5 h-5"
                                onClick={() => setSort(sort === "name-asc" ? "" : "name-asc")}
                                variant={sort === "name-asc" ? "default" : "outline"}
                            >
                                <span className="scale-80">A</span>
                            </Button>
                            <Button
                                size="icon"
                                className="w-5 h-5"
                                onClick={() => setSort(sort === "name-desc" ? "" : "name-desc")}
                                variant={sort === "name-desc" ? "default" : "outline"}
                            >
                                <span className="scale-80">Z</span>
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center relative px-6">
                        <span className="text-sm">Nowość</span>
                        <div className="absolute right-6 flex gap-1">
                            <Button
                                size={"icon"}
                                className="w-5 h-5"
                                onClick={() => setSort(sort === "newest" ? "" : "newest")}
                                variant={sort === "newest" ? "default" : "outline"}
                            >
                                <ArrowUp className="scale-80" />
                            </Button>
                            <Button
                                size={"icon"}
                                className="w-5 h-5"
                                onClick={() => setSort(sort === "oldest" ? "" : "oldest")}
                                variant={sort === "oldest" ? "default" : "outline"}
                            >
                                <ArrowDown className="scale-80" />
                            </Button>
                        </div>
                    </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>Filtry</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                    onClick={toggleAll}
                    onSelect={(e) => e.preventDefault()}
                    checked={allSelected}
                >
                    {allSelected ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator className="mx-2 bg-gray-200" />
                {rarityList.map((rarity) => (
                    <DropdownMenuCheckboxItem
                        onSelect={(e) => e.preventDefault()}
                        key={rarity}
                        checked={activeFilters.includes(rarity)}
                        onCheckedChange={() => toggleFilter(rarity)}
                    >
                        <span className="capitalize">{rarity}</span>
                    </DropdownMenuCheckboxItem>
                ))}

                <DropdownMenuSeparator />

                {/* Nowy checkbox – pokaż tylko zdobyte */}
                <DropdownMenuCheckboxItem
                    onSelect={(e) => e.preventDefault()}
                    checked={showOwnedOnly}
                    onCheckedChange={(val) => setShowOwnedOnly(!!val)}
                >
                    Pokaż tylko zdobyte
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={resetFilters}>
                    Resetuj filtry
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
