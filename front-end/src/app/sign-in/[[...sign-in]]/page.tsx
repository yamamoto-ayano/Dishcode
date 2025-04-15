import { SignIn } from '@clerk/nextjs'

export const runtime = 'edge';


export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignIn fallbackRedirectUrl={"/setting"} />
    </div>
  )
}