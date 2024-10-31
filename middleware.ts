import { clerkClient, clerkMiddleware } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const publicRoutes = [
  "/",
  "/api/webhook/register",
  "/sign-up",
  "/sign-in"

]

export default clerkMiddleware({
  publicRoutes,
  async afterAuth(auth: any, req: NextRequest) {
    try {
      //handle unauth users trying to access protected routes
      if (!auth.userId && !publicRoutes.includes(req.nextUrl.pathname)) {
        return NextResponse.redirect(new URL("/sign-in", req.url))
      }

      if (auth.userId) {
        const user = await clerkClient.getUser(auth.userId)
        const role = user.publicMetaData.role as string | undefined

        //admin role redirection

        if (role === "admin" && req.nextUrl.pathname === "/dashboard") {
          return NextResponse.redirect(new URL("/admin/dashboard", req.url))
        }

        // prevent non admin user to access the admin routes 
        if (role !== "admin" && req.nextUrl.pathname.startsWith('/admin')) {
          return NextResponse.redirect(new URL("/dashboard", req.url))

        }

        // redirect auth users trying to access public routes
        if (publicRoutes.includes(req.nextUrl.pathname)) {
          return NextResponse.redirect(
            new URL(
              role === "/admin" ? "/admin/dashboard" : "/dashboard",
              req.url
            )
          )
        }
      }
    }
    catch (error: any) {
      console.error(error)
      return NextResponse.redirect(new URL("/error",  req.url))
    }
  }

}
)

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}