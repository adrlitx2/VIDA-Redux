import { PassportStatic } from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "../storage";

export function setupPassport(passport: PassportStatic) {
  // Local Strategy for email/password login
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          console.log("Attempting login for:", email);
          
          // Find user by email
          const user = await storage.getUserByEmail(email);
          
          // User not found
          if (!user) {
            console.log("User not found:", email);
            return done(null, false, { message: "Invalid email or password" });
          }
          
          // User is blocked
          if (user.blocked) {
            console.log("User is blocked:", email);
            return done(null, false, { message: "Account has been suspended" });
          }
          
          // Check password
          if (!user.password) {
            console.log("No password set for user:", email);
            return done(null, false, { message: "Please log in using social provider" });
          }
          
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            console.log("Password mismatch for user:", email);
            return done(null, false, { message: "Invalid email or password" });
          }
          
          console.log("Login successful for:", email);
          
          // Remove sensitive data before returning user
          const { password: _, ...userWithoutPassword } = user;
          
          return done(null, userWithoutPassword);
        } catch (error) {
          console.error("Login error:", error);
          return done(error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log("User not found for deserialize:", id);
        return done(null, false);
      }
      
      // User is blocked
      if (user.blocked) {
        console.log("User is blocked for deserialize:", id);
        return done(null, false);
      }
      
      // Remove sensitive data
      const { password: _, ...userWithoutPassword } = user;
      
      done(null, userWithoutPassword);
    } catch (error) {
      console.error("Deserialize error:", error);
      done(error);
    }
  });
}