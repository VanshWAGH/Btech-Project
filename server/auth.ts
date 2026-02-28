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
            secret: process.env.REPL_ID || "super_secret_local_dev_key",
            resave: false,
            saveUninitialized: false,
            store,
        })
    );

    passport.use(
        new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
            try {
                const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
                if (!user || !(await comparePasswords(password, user.password))) {
                    return done(null, false, { message: "Invalid email or password" });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        })
    );

    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
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
    app.post("/api/register", async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
            if (existingUser.length > 0) {
                return res.status(400).json({ message: "Email already exists" });
            }

            const hashedPassword = await hashPassword(password);
            const [user] = await db
                .insert(users)
                .values({ email, password: hashedPassword })
                .returning();

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json({ message: "Registration successful" });
            });
        } catch (err) {
            next(err);
        }
    });

    app.post("/api/login", passport.authenticate("local"), (req, res) => {
        res.status(200).json({ message: "Login successful" });
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

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
