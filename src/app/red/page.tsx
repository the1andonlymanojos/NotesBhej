import Link from "next/link";


function RedPage() {
    return (
        <div>
            <h1>Red</h1>
            <Link href="/blue">Blue page</Link>
        </div>
    )
}

export default RedPage;