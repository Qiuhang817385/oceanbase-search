import Link from 'next/link'

export default function Home() {
  return (
    <div className="font-sans flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <Link href="/prisma-search">前往 Prisma Search</Link>
      <Link href="/test-movies-demo">前往 Test Movies Demo</Link>
    </div>
  )
}
