import PageHeader from "@/components/layout/PageHeader";
import ShopSkeleton from "@/components/shop/ShopSkeleton";

export default function ShopLoading() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <PageHeader title="Sklep" description="Kupuj nowe paczki i wypełniaj swój indeks kart!" />
            <ShopSkeleton />
        </div>
    );
}
