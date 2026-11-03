import Lottie from "lottie-react";
import animationData from "@public/Loading.json"

export default function LoadingIndicator() {
    return (
        <div className={'relative grid place-items-center'}>
            <Lottie animationData={animationData} loop autoplay/>
        </div>
    )
}