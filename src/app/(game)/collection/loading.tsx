import {SetGridSkeleton} from "@/components/data-display/CollectionSkeletons";
import PageHeader from "@/components/layout/PageHeader";

export default function CollectionLoading() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <PageHeader
                title="Twój indeks kart"
                description="Kliknij w paczkę, by zobaczyć swój postęp w zbieraniu kart!"
                tone="sun"
            />
            <SetGridSkeleton />
        </div>
    );
}
