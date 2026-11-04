import {cn} from "@/lib/utils";

const TONES = {
    lilac: {field: "bg-lilac", circleA: "bg-pink", circleB: "bg-aqua"},
    sun: {field: "bg-sun", circleA: "bg-peach", circleB: "bg-pink"},
    pink: {field: "bg-pink", circleA: "bg-peach", circleB: "bg-lilac"},
    aqua: {field: "bg-aqua", circleA: "bg-sun", circleB: "bg-lilac"},
};

type PageHeaderProps = {
    title: React.ReactNode;
    description?: string;
    tone?: keyof typeof TONES;
    children?: React.ReactNode;
};

export default function PageHeader({title, description, tone = "lilac", children}: PageHeaderProps) {
    const colors = TONES[tone];
    return (
        <section className={cn("relative overflow-hidden rounded-stage px-6 py-6 md:px-8 md:py-8", colors.field)}>
            <div
                aria-hidden="true"
                className={cn("absolute -top-24 -right-16 size-64 rounded-full md:size-80", colors.circleA)}
            />
            <div
                aria-hidden="true"
                className={cn("absolute -bottom-24 left-1/3 size-40 rounded-full md:size-56", colors.circleB)}
            />
            <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <h1 className="font-display text-2xl leading-tight font-bold text-balance md:text-3xl">{title}</h1>
                    {description && <p className="max-w-xl font-medium">{description}</p>}
                </div>
                {children}
            </div>
        </section>
    );
}
