import { clerkClient, clerkMiddleware, Client, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';

const publicRoutes = createRouteMatcher(["/", "/api/webhook/register", '/sign-up', '/sign-in'])

export default clerkMiddleware({
  publicRoutes,
  async afterAuth(auth, req){
    if(!auth.userId && !publicRoutes.includes(req.nextUrl.pathname)){
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    if(auth.userId){
      try {
        const client = await clerkClient()
        const user = await client.users?.getUser(auth.userId)
        const role = user.publicMetadata.role as string | undefined;

        //admin role redirection
        if(role === "admin" && req.nextUrl.pathname === "/dashboard"){
          return NextResponse.redirect(new URL("/admin/dashboard", req.url));
        }

        //prevent non admin user to access the admin routes
        if(role !== "admin" && req.nextUrl.pathname.startsWith("/admin")){
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        //redirect auth user tyring to access public routes
        if(publicRoutes.includes(req.nextUrl.pathname)){
          return NextResponse.redirect(
            role === "admin" ? "/admin/dashboard" : "/dashboard",
            req.url
          );
        }

      } catch (error) {
        console.error(error)
        return NextResponse.redirect(new URL("/error", req.url));
      }
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}