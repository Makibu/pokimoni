import Image from "next/image";
import {cn} from "@/lib/utils";

export default function UserAvatar({
    username,
    avatar,
    size,
    className,
}: {
    username: string;
    avatar: number | null;
    size: number;
    className?: string;
}) {
    if (avatar) {
        return (
            <Image
                src={`/avatars/avatar-${avatar}.webp`}
                alt=""
                width={size}
                height={size}
                className={cn("rounded-full object-cover", className)}
                style={{width: size, height: size}}
            />
        );
    }
    return (
        <span
            aria-hidden="true"
            className={cn(
                "flex items-center justify-center rounded-full bg-primary font-bold text-primary-foreground uppercase",
                className,
            )}
            style={{width: size, height: size, fontSize: size * 0.4}}
        >
            {username.charAt(0)}
        </span>
    );
}
