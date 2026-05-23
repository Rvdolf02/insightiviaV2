import arcjet, { fixedWindow, tokenBucket } from "@arcjet/next";

// This code is for the limiting of adding transaction
export const aj = arcjet({
    key: process.env.ARCJET_KEY,
    characteristics: ["userId"], // Track based on Clerk userId
    rules: [
        tokenBucket({
            mode: "LIVE",
            refillRate: 1000, // Increase based on requirement
            interval: 3600,
            capacity: 1000,   // Increase based on requirement
        }),
    ],
});

// Create a limiter for daily tips: allow once per day
export const ajTips = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"],
  rules: [
    // Daily tips limiter
    tokenBucket({
      mode: "LIVE",
      refillRate: 1,      // 1 request per interval
      interval: 86400,    // every 24 hours (86400 seconds)
      capacity: 1,        // max 1 per day
    }),
  ],
});

// Create a limiter for spendsense: limit the output once per week
export const ajSpendsense = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"],
  rules: [
    // Spendsense limiter
    tokenBucket({
      mode: "LIVE",
      refillRate: 1,
       interval: 7 * 24 * 3600, // 7 days
      capacity: 1,
    }),
  ],
})

export const ajGeneralLimit = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"], // Tracks per logged-in user
  rules: [
    fixedWindow({
      mode: "LIVE",
      window: "1m", // Sets the time window to 1 minute
      max: 60,      // Limits to 60 requests per window
    }),
  ],
});