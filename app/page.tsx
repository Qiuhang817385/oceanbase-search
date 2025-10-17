import Link from 'next/link'

export default function Home() {
  return (
    <div className="font-sans flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <Link href="/hybrid-search">前往混合搜索</Link>
    </div>
  )
}
