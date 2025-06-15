import Link from "next/link";

function BluePage() {
    return (
        <div>
            <h1>Blue</h1>
            <Link href="/red">Red page</Link>
        </div>
    )
}

export default BluePage;