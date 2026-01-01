import { CookieOptions, createServerClient } from '@supabase/ssr'
import {  NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    const supabaseResponse = NextResponse.next({
        request,
    })
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string }[]) {
                    cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
                        request.cookies.set(name, value),
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: CookieOptions }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );


    // refreshing the auth token
    await supabase.auth.getUser()
    console.log("supabase.auth.getUser()", supabase.auth.getUser())

    return supabaseResponse
}