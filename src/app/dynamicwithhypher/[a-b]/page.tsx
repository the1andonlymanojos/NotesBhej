export default async function Page({
    params,
  }: {
    params: Promise<{ "a-b": string }>
  }) {
    const parm = await params
    console.log("param", parm)
    console.log("param a-b", parm["a-b"])

    return <div>My Post: {parm["a-b"]}</div>
  }