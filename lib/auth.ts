import { NextAuthOptions } from "next-auth";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";
import { createServerSupabaseClient } from "./supabase";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const supabase = createServerSupabaseClient();

        try {
          if (credentials.action === "signup") {
            const { data: authData, error: authError } =
              await supabase.auth.signUp({
                email: credentials.email,
                password: credentials.password,
              });

            if (authError) {
              console.error("Supabase signUp error:", authError);
            }

            // If user already exists, attempt to sign them in instead of failing
            if (
              authError &&
              authError.message?.toLowerCase().includes("already registered")
            ) {
              const { data: signInData, error: signInError } =
                await supabase.auth.signInWithPassword({
                  email: credentials.email,
                  password: credentials.password,
                });
              if (signInError || !signInData.user) {
                console.error(
                  "Supabase signInWithPassword error:",
                  signInError
                );
                throw new Error(signInError?.message || "Invalid credentials");
              }
              console.log(
                "Supabase signInWithPassword success for",
                credentials.email
              );

              // Ensure profile exists on sign-in
              const username = credentials.email.split("@")[0];
              const { error: profileError } = await (supabase as any)
                .from("profiles")
                .upsert(
                  {
                    id: signInData.user.id,
                    username,
                    display_name: username,
                    status: "online",
                  },
                  { onConflict: "id" }
                );
              if (
                profileError &&
                !/duplicate key/i.test(profileError.message)
              ) {
                console.error(
                  "Profile upsert error (signin path):",
                  profileError
                );
              }

              return {
                id: signInData.user.id,
                email: signInData.user.email!,
                name: credentials.email.split("@")[0],
              };
            }

            // If confirmations are enabled, authData.user may be null
            if (!authData?.user) {
              throw new Error(
                "Signup successful. Please confirm your email before signing in."
              );
            }

            // Best-effort profile creation (ignore duplicates)
            const username = credentials.email.split("@")[0];
            const { error: profileError } = await (supabase as any)
              .from("profiles")
              .upsert(
                {
                  id: authData.user.id,
                  username,
                  display_name: username,
                  status: "online",
                },
                { onConflict: "id" }
              );
            if (profileError && !/duplicate key/i.test(profileError.message)) {
              // Log unexpected profile errors but don't block auth
              console.error("Profile upsert error:", profileError);
            } else {
              console.log("Profile upserted for", authData.user.id);
            }

            return {
              id: authData.user.id,
              email: authData.user.email!,
              name: username,
            };
          } else {
            const { data: authData, error: authError } =
              await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
              });

            if (authError || !authData?.user) {
              console.error("Supabase signInWithPassword error:", authError);
              throw new Error(authError?.message || "Invalid credentials");
            }

            // Ensure profile exists on sign-in
            const username = credentials.email.split("@")[0];
            const { error: profileError } = await (supabase as any)
              .from("profiles")
              .upsert(
                {
                  id: authData.user.id,
                  username,
                  display_name: username,
                  status: "online",
                },
                { onConflict: "id" }
              );
            if (profileError && !/duplicate key/i.test(profileError.message)) {
              console.error(
                "Profile upsert error (signin path):",
                profileError
              );
            }

            console.log(
              "Supabase signInWithPassword success for",
              credentials.email
            );
            return {
              id: authData.user.id,
              email: authData.user.email!,
              name: credentials.email.split("@")[0],
            };
          }
        } catch (error: any) {
          console.error("Auth error:", error);
          // Throwing ensures the message is surfaced to the client via signIn result
          throw new Error(error?.message || "Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // @ts-expect-error augmenting session user
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
};
