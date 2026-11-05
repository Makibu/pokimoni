import type {Metadata} from "next";
import MinigameScreen from "@/components/minigame/MinigameScreen";

export const metadata: Metadata = {title: "Minigra dnia"};

export default function MinigamePage() {
    return <MinigameScreen />;
}
