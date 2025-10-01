'use client'

export default function TabHeader({title, description}: { title: string, description: string }) {
    return (
        <div
            className={'flex justify-center items-center w-full py-4 md:py-12 shadow-sm bg-white flex-col text-blue-500 gap-2 md:gap-4 px-12 text-center pt-20 md:pt-24 lg:pt-32'}>
            <h1 className={'text-3xl md:text-5xl font-semibold'}>{title}</h1>
            <h2 className={'text-gray-500 text-base md:text-xl'}>{description}</h2>
        </div>
    )
}