import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express } from "express";
import { storage } from "../storage/index";
import { authService } from "./auth-service";

// Social Auth Configuration
export async function setupSocialAuth(app: Express) {
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if this should be an admin user and assign default organization
            const email = profile.emails?.[0]?.value || "";
            let organizationId;
            let role = "admin";

            // Admin detection logic - could be based on email domain or specific emails
            if (
              email.includes("@prolifeprosper.com") ||
              email.includes("@prolifegive.com")
            ) {
              const defaultAdminOrg =
                await storage.getDefaultAdminOrganization();
              if (defaultAdminOrg) {
                organizationId = defaultAdminOrg.id;
                role = "super_admin";
              }
            }

            const user = await storage.upsertUser({
              id: profile.id,
              email,
              firstName: profile.name?.givenName || "",
              lastName: profile.name?.familyName || "",
              profileImageUrl: profile.photos?.[0]?.value || "",
              provider: "google",
              providerId: profile.id,
              organizationId,
              role,
            });
            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        },
      ),
    );
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: "/api/auth/facebook/callback",
          profileFields: [
            "id",
            "displayName",
            "photos",
            "email",
            "first_name",
            "last_name",
          ],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if this should be an admin user and assign default organization
            const email = profile.emails?.[0]?.value || "";
            let organizationId;
            let role = "admin";

            // Admin detection logic - could be based on email domain or specific emails
            if (
              email.includes("@prolifeprosper.com") ||
              email.includes("@prolifegive.com")
            ) {
              const defaultAdminOrg =
                await storage.getDefaultAdminOrganization();
              if (defaultAdminOrg) {
                organizationId = defaultAdminOrg.id;
                role = "super_admin";
              }
            }

            const user = await storage.upsertUser({
              id: profile.id,
              email,
              firstName: profile.name?.givenName || "",
              lastName: profile.name?.familyName || "",
              profileImageUrl: profile.photos?.[0]?.value || "",
              provider: "facebook",
              providerId: profile.id,
              organizationId,
              role,
            });
            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        },
      ),
    );
  }

  // Truth Social OAuth Strategy (Custom implementation)
  // Truth Social uses OAuth 2.0 with custom implementation
  if (
    process.env.TRUTH_SOCIAL_CLIENT_ID &&
    process.env.TRUTH_SOCIAL_CLIENT_SECRET
  ) {
    console.log(
      "Truth Social OAuth configured - manual implementation required",
    );
  }

  // Social Auth Routes

  // Google Routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] }),
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/auth/signin?error=google_auth_failed",
    }),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user) {
          return res.redirect("/auth/signin?error=auth_failed");
        }

        // Generate JWT token for the user
        const token = await authService.generateTokenForUser(user);

        // Redirect to frontend with token (you can also use a different method)
        res.redirect(`/auth/success?token=${token}`);
      } catch (error) {
        console.error("Google auth callback error:", error);
        res.redirect("/auth/signin?error=auth_failed");
      }
    },
  );

  // Facebook Routes
  app.get(
    "/api/auth/facebook",
    passport.authenticate("facebook", { scope: ["email", "public_profile"] }),
  );

  app.get(
    "/api/auth/facebook/callback",
    passport.authenticate("facebook", {
      failureRedirect: "/auth/signin?error=facebook_auth_failed",
    }),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user) {
          return res.redirect("/auth/signin?error=auth_failed");
        }

        // Generate JWT token for the user
        const token = await authService.generateTokenForUser(user);

        // Redirect to frontend with token
        res.redirect(`/auth/success?token=${token}`);
      } catch (error) {
        console.error("Facebook auth callback error:", error);
        res.redirect("/auth/signin?error=auth_failed");
      }
    },
  );

  // TikTok OAuth Routes (Manual Implementation)
  app.get("/api/auth/tiktok", (req, res) => {
    if (!process.env.TIKTOK_CLIENT_ID) {
      return res.redirect("/signin?error=tiktok_not_configured");
    }

    const tiktokAuthUrl =
      `https://www.tiktok.com/auth/authorize/` +
      `?client_key=${process.env.TIKTOK_CLIENT_ID}` +
      `&scope=user.info.basic,user.info.profile,user.info.stats` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(process.env.TIKTOK_REDIRECT_URI || "http://localhost:5000/api/auth/tiktok/callback")}` +
      `&state=${Math.random().toString(36).substring(7)}`;

    res.redirect(tiktokAuthUrl);
  });

  app.get("/api/auth/tiktok/callback", async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect("/signin?error=tiktok_auth_cancelled");
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://open-api.tiktok.com/oauth/access_token/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_ID!,
            client_secret: process.env.TIKTOK_CLIENT_SECRET!,
            code: code as string,
            grant_type: "authorization_code",
            redirect_uri:
              process.env.TIKTOK_REDIRECT_URI ||
              "http://localhost:5000/api/auth/tiktok/callback",
          }),
        },
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return res.redirect("/signin?error=tiktok_token_failed");
      }

      // Get user profile
      const profileResponse = await fetch(
        "https://open-api.tiktok.com/user/info/",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        },
      );

      const profileData = await profileResponse.json();

      if (profileData.error) {
        return res.redirect("/signin?error=tiktok_profile_failed");
      }

      // Create/update user in database
      const user = await storage.upsertUser({
        id: profileData.data.user.open_id,
        email: profileData.data.user.email || "",
        firstName: profileData.data.user.display_name?.split(" ")[0] || "",
        lastName:
          profileData.data.user.display_name?.split(" ").slice(1).join(" ") ||
          "",
        profileImageUrl: profileData.data.user.avatar_url || "",
        provider: "tiktok",
        providerId: profileData.data.user.open_id,
      });

      // Generate JWT token for the user
      const token = await authService.generateTokenForUser(user);

      // Redirect to frontend with token
      res.redirect(`/auth/success?token=${token}`);
    } catch (error) {
      console.error("TikTok OAuth error:", error);
      return res.redirect("/auth/signin?error=tiktok_auth_error");
    }
  });

  // Truth Social OAuth Routes (Manual Implementation)
  app.get("/api/auth/truthsocial", (req, res) => {
    if (!process.env.TRUTH_SOCIAL_CLIENT_ID) {
      return res.redirect("/auth/signin?error=truthsocial_not_configured");
    }

    const truthSocialAuthUrl =
      `https://truthsocial.com/oauth/authorize` +
      `?client_id=${process.env.TRUTH_SOCIAL_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(process.env.TRUTH_SOCIAL_REDIRECT_URI || "http://localhost:5000/api/auth/truthsocial/callback")}` +
      `&response_type=code` +
      `&scope=read` +
      `&state=${Math.random().toString(36).substring(7)}`;

    res.redirect(truthSocialAuthUrl);
  });

  app.get("/api/auth/truthsocial/callback", async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect("/auth/signin?error=truthsocial_auth_cancelled");
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch("https://truthsocial.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.TRUTH_SOCIAL_CLIENT_ID!,
          client_secret: process.env.TRUTH_SOCIAL_CLIENT_SECRET!,
          code: code as string,
          grant_type: "authorization_code",
          redirect_uri:
            process.env.TRUTH_SOCIAL_REDIRECT_URI ||
            "http://localhost:5000/api/auth/truthsocial/callback",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return res.redirect("/auth/signin?error=truthsocial_token_failed");
      }

      // Get user profile
      const profileResponse = await fetch(
        "https://truthsocial.com/api/v1/accounts/verify_credentials",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        },
      );

      const profileData = await profileResponse.json();

      if (profileData.error) {
        return res.redirect("/auth/signin?error=truthsocial_profile_failed");
      }

      // Create/update user in database
      const user = await storage.upsertUser({
        id: profileData.id,
        email: profileData.email || "",
        firstName: profileData.display_name?.split(" ")[0] || "",
        lastName: profileData.display_name?.split(" ").slice(1).join(" ") || "",
        profileImageUrl: profileData.avatar || "",
        provider: "truthsocial",
        providerId: profileData.id,
      });

      // Generate JWT token for the user
      const token = await authService.generateTokenForUser(user);

      // Redirect to frontend with token
      res.redirect(`/auth/success?token=${token}`);
    } catch (error) {
      console.error("Truth Social OAuth error:", error);
      return res.redirect("/auth/signin?error=truthsocial_auth_error");
    }
  });

  // X (Twitter) OAuth Routes (Manual Implementation)
  app.get("/api/auth/twitter", (req, res) => {
    if (!process.env.TWITTER_CLIENT_ID) {
      return res.redirect("/auth/signin?error=twitter_not_configured");
    }

    const twitterAuthUrl =
      `https://twitter.com/i/oauth2/authorize` +
      `?response_type=code` +
      `&client_id=${process.env.TWITTER_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(process.env.TWITTER_REDIRECT_URI || "http://localhost:5000/api/auth/twitter/callback")}` +
      `&scope=tweet.read%20users.read` +
      `&state=${Math.random().toString(36).substring(7)}` +
      `&code_challenge=challenge` +
      `&code_challenge_method=plain`;

    res.redirect(twitterAuthUrl);
  });

  app.get("/api/auth/twitter/callback", async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect("/auth/signin?error=twitter_auth_cancelled");
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://api.twitter.com/2/oauth2/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: process.env.TWITTER_CLIENT_ID!,
            client_secret: process.env.TWITTER_CLIENT_SECRET!,
            code: code as string,
            grant_type: "authorization_code",
            redirect_uri:
              process.env.TWITTER_REDIRECT_URI ||
              "http://localhost:5000/api/auth/twitter/callback",
            code_verifier: "challenge",
          }),
        },
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return res.redirect("/auth/signin?error=twitter_token_failed");
      }

      // Get user profile
      const profileResponse = await fetch(
        "https://api.twitter.com/2/users/me",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        },
      );

      const profileData = await profileResponse.json();

      if (profileData.error) {
        return res.redirect("/auth/signin?error=twitter_profile_failed");
      }

      // Create/update user in database
      const user = await storage.upsertUser({
        id: profileData.data.id,
        email: profileData.data.email || "",
        firstName: profileData.data.name?.split(" ")[0] || "",
        lastName: profileData.data.name?.split(" ").slice(1).join(" ") || "",
        profileImageUrl: profileData.data.profile_image_url || "",
        provider: "twitter",
        providerId: profileData.data.id,
      });

      // Generate JWT token for the user
      const token = await authService.generateTokenForUser(user);

      // Redirect to frontend with token
      res.redirect(`/auth/success?token=${token}`);
    } catch (error) {
      console.error("Twitter OAuth error:", error);
      return res.redirect("/auth/signin?error=twitter_auth_error");
    }
  });

  // LinkedIn OAuth routes
  app.get("/api/auth/linkedin", async (req, res) => {
    if (
      !process.env.LINKEDIN_CLIENT_ID ||
      !process.env.LINKEDIN_CLIENT_SECRET
    ) {
      return res.redirect("/auth/signin?error=linkedin_not_configured");
    }

    const state = crypto.randomBytes(32).toString("hex");
    const scope = "r_liteprofile r_emailaddress";
    const authURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI || "http://localhost:5000/api/auth/linkedin/callback")}&state=${state}&scope=${encodeURIComponent(scope)}`;

    res.redirect(authURL);
  });

  app.get("/api/auth/linkedin/callback", async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.redirect("/auth/signin?error=linkedin_no_code");
      }

      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code as string,
            redirect_uri:
              process.env.LINKEDIN_REDIRECT_URI ||
              "http://localhost:5000/api/auth/linkedin/callback",
            client_id: process.env.LINKEDIN_CLIENT_ID!,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
          }),
        },
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return res.redirect("/auth/signin?error=linkedin_token_failed");
      }

      // Get user profile
      const profileResponse = await fetch(
        "https://api.linkedin.com/v2/people/~:(id,firstName,lastName,emailAddress)",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        },
      );

      const profileData = await profileResponse.json();

      if (profileData.error) {
        return res.redirect("/auth/signin?error=linkedin_profile_failed");
      }

      // Create/update user in database
      const user = await storage.upsertUser({
        id: profileData.id,
        email: profileData.emailAddress || "",
        firstName: profileData.firstName?.localized?.en_US || "",
        lastName: profileData.lastName?.localized?.en_US || "",
        provider: "linkedin",
        providerId: profileData.id,
      });

      // Generate JWT token for the user
      const token = await authService.generateTokenForUser(user);

      // Redirect to frontend with token
      res.redirect(`/auth/success?token=${token}`);
    } catch (error) {
      console.error("LinkedIn OAuth error:", error);
      return res.redirect("/auth/signin?error=linkedin_auth_error");
    }
  });

  // Apple ID OAuth routes
  app.get("/api/auth/apple", async (req, res) => {
    if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_CLIENT_SECRET) {
      return res.redirect("/auth/signin?error=apple_not_configured");
    }

    const state = crypto.randomBytes(32).toString("hex");
    const scope = "name email";
    const authURL = `https://appleid.apple.com/auth/authorize?response_type=code&client_id=${process.env.APPLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.APPLE_REDIRECT_URI || "http://localhost:5000/api/auth/apple/callback")}&state=${state}&scope=${encodeURIComponent(scope)}&response_mode=form_post`;

    res.redirect(authURL);
  });

  app.post("/api/auth/apple/callback", async (req, res) => {
    try {
      const { code, user } = req.body;

      if (!code) {
        return res.redirect("/auth/signin?error=apple_no_code");
      }

      // Create/update user in database
      const userData = user ? JSON.parse(user) : {};
      const dbUser = await storage.upsertUser({
        id: crypto.randomUUID(),
        email: userData.email || "",
        firstName: userData.name?.firstName || "",
        lastName: userData.name?.lastName || "",
        provider: "apple",
        providerId: userData.sub || code,
      });

      // Generate JWT token for the user
      const token = await authService.generateTokenForUser(dbUser);

      // Redirect to frontend with token
      res.redirect(`/auth/success?token=${token}`);
    } catch (error) {
      console.error("Apple OAuth error:", error);
      return res.redirect("/auth/signin?error=apple_auth_error");
    }
  });

  // Microsoft OAuth routes
  app.get("/api/auth/microsoft", async (req, res) => {
    if (
      !process.env.MICROSOFT_CLIENT_ID ||
      !process.env.MICROSOFT_CLIENT_SECRET
    ) {
      return res.redirect("/auth/signin?error=microsoft_not_configured");
    }

    const state = crypto.randomBytes(32).toString("hex");
    const scope = "https://graph.microsoft.com/User.Read";
    const authURL = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=code&client_id=${process.env.MICROSOFT_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI || "http://localhost:5000/api/auth/microsoft/callback")}&state=${state}&scope=${encodeURIComponent(scope)}`;

    res.redirect(authURL);
  });

  app.get("/api/auth/microsoft/callback", async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.redirect("/auth/signin?error=microsoft_no_code");
      }

      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code as string,
            redirect_uri:
              process.env.MICROSOFT_REDIRECT_URI ||
              "http://localhost:5000/api/auth/microsoft/callback",
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            scope: "https://graph.microsoft.com/User.Read",
          }),
        },
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return res.redirect("/auth/signin?error=microsoft_token_failed");
      }

      // Get user profile
      const profileResponse = await fetch(
        "https://graph.microsoft.com/v1.0/me",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        },
      );

      const profileData = await profileResponse.json();

      if (profileData.error) {
        return res.redirect("/auth/signin?error=microsoft_profile_failed");
      }

      // Create/update user in database
      const user = await storage.upsertUser({
        id: profileData.id,
        email: profileData.mail || profileData.userPrincipalName || "",
        firstName: profileData.givenName || "",
        lastName: profileData.surname || "",
        provider: "microsoft",
        providerId: profileData.id,
      });

      // Generate JWT token for the user
      const token = await authService.generateTokenForUser(user);

      // Redirect to frontend with token
      res.redirect(`/auth/success?token=${token}`);
    } catch (error) {
      console.error("Microsoft OAuth error:", error);
      return res.redirect("/auth/signin?error=microsoft_auth_error");
    }
  });

  // General logout route
  app.get("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });
}

// Helper function to check if social providers are configured
export function getSocialProvidersStatus() {
  return {
    google: !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
    facebook: !!(
      process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET
    ),
    tiktok: !!(
      process.env.TIKTOK_CLIENT_ID && process.env.TIKTOK_CLIENT_SECRET
    ),
    truthsocial: !!(
      process.env.TRUTH_SOCIAL_CLIENT_ID &&
      process.env.TRUTH_SOCIAL_CLIENT_SECRET
    ),
    twitter: !!(
      process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
    ),
    linkedin: !!(
      process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
    ),
    apple: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
    microsoft: !!(
      process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
    ),
  };
}
