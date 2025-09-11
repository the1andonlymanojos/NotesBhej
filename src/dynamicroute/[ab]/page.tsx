export default async function Page({
    params,
  }: {
    params: Promise<{ "ab": string }>
  }) {
    const parm = await params
    console.log("param", parm)
    console.log("param ab", parm["ab"])

    return <div>My Post: {parm["ab"]}</div>
  }