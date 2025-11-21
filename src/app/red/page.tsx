import Link from "next/link";
import BackgroundSelector from "@/components/background-selector";

function RedPage() {
    return (
        <div>

<BackgroundSelector />
            <h1>Red</h1>
            <Link href="/blue">Blue page</Link>
        </div>
    )
}

export default RedPage;