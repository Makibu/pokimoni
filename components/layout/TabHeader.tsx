export default function TabHeader({title, description}: { title: string, description: string }) {
    return (
        <div
            className={'flex justify-center items-center w-full h-12 md:h-18 lg:h-72 shadow-sm bg-white flex-col text-blue-500 gap-4 pt-16'}>
            <h1 className={'text-5xl font-semibold'}>{title}</h1>
            <h2 className={'text-gray-500 text-xl'}>{description}</h2>
        </div>
    )
}