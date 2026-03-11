import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  const PostgresStore = connectPg(session);

  const store = new PostgresStore({
    pool: pool,
    createTableIfMissing: true,
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || process.env.REPL_ID || "super_secret_local_dev_key_2025",
      resave: false,
      saveUninitialized: false,
      store,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }
        const valid = await comparePasswords(password, user.password);
        if (!valid) {
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Serialize user ID as number
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize: id is a number from the DB
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

export function registerAuthRoutes(app: Express) {
  // REGISTER
  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, role, department } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);

      // Build safe insert values — provide defaults for legacy NOT NULL columns
      const insertValues: any = {
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || "STUDENT",
        department: department || null,
        username: email.split("@")[0], // use email prefix as username default
        name: `${firstName || ""} ${lastName || ""}`.trim() || email.split("@")[0],
      };

      const [user] = await db.insert(users).values(insertValues).returning();

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _pw, ...safeUser } = user;
        res.status(201).json({ message: "Registration successful", user: safeUser });
      });
    } catch (err: any) {
      console.error("Register error:", err);
      next(err);
    }
  });

  // LOGIN
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { password: _pw, ...safeUser } = user;
        res.status(200).json({ message: "Login successful", user: safeUser });
      });
    })(req, res, next);
  });

  // LOGOUT
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // CURRENT USER
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...safeUser } = req.user as any;
      return res.json(safeUser);
    }
    return res.status(401).json({ message: "Not authenticated" });
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};
