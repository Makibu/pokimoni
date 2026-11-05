import {MinigameHeader, MinigameSkeleton} from "@/components/minigame/MinigameScreen";

export default function MinigameLoading() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <MinigameHeader />
            <MinigameSkeleton />
        </div>
    );
}
