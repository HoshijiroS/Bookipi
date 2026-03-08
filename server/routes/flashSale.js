const express = require("express");
const { getRedis } = require("../redisClient");

const router = express.Router();

const START_KEY = "flash_sale:start";
const END_KEY = "flash_sale:end";

router.get("/", async (req, res) => {
  try {
    const client = await getRedis();
    const [start, end] = await Promise.all([client.get(START_KEY), client.get(END_KEY)]);
    return res.json({
      start: start || null,
      end: end || null
    });
  } catch (e) {
    console.error("Failed to load flash sale config", e);
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/status", async (req, res) => {
  try {
    const client = await getRedis();
    const [startRaw, endRaw] = await Promise.all([client.get(START_KEY), client.get(END_KEY)]);

    const now = new Date();
    let status = "ended";

    if (startRaw && endRaw) {
      const start = new Date(startRaw);
      const end = new Date(endRaw);

      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        if (now < start) {
          status = "upcoming";
        } else if (now >= start && now <= end) {
          status = "active";
        } else {
          status = "ended";
        }
      }
    }

    return res.json({
      status,
      now: now.toISOString(),
      start: startRaw || null,
      end: endRaw || null
    });
  } catch (e) {
    console.error("Failed to calculate flash sale status", e);
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/", async (req, res) => {
  const rawStart = req.body?.start;
  const rawEnd = req.body?.end;

  if (rawStart == null && rawEnd == null) {
    try {
      const client = await getRedis();
      await Promise.all([client.del(START_KEY), client.del(END_KEY)]);
      return res.json({ ok: true, start: null, end: null });
    } catch (e) {
      console.error("Failed to clear flash sale config", e);
      return res.status(500).json({ error: "internal_error" });
    }
  }

  if (typeof rawStart !== "string" || typeof rawEnd !== "string") {
    return res.status(400).json({ error: "start and end must be strings or null" });
  }

  const start = new Date(rawStart);
  const end = new Date(rawEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: "invalid start or end datetime" });
  }

  if (start >= end) {
    return res.status(400).json({ error: "start must be before end" });
  }

  try {
    const client = await getRedis();
    await Promise.all([
      client.set(START_KEY, start.toISOString()),
      client.set(END_KEY, end.toISOString())
    ]);
    return res.json({ ok: true, start: start.toISOString(), end: end.toISOString() });
  } catch (e) {
    console.error("Failed to save flash sale config", e);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;

