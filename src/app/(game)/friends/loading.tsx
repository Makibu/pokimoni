import PageHeader from "@/components/layout/PageHeader";
import {FriendsSkeleton} from "@/components/social/FriendsSkeleton";

export default function FriendsLoading() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <PageHeader title="Znajomi" description="Zapraszaj graczy i wymieniaj się z nimi kartami" tone="pink" />
            <FriendsSkeleton />
        </div>
    );
}
