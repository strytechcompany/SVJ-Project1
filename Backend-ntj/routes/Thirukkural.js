const express = require("express");
const router = express.Router();
const Thirukkural = require("../models/Thirukkural");

router.get("/", async (req, res) => {
    try {
        let record = await Thirukkural.findOne();

        // Seed default if no record exists yet
        if (!record) {
            record = await Thirukkural.create({
                kural: "மனத்துக்கண் மாசிலன் ஆதல் அனைத்தறன் ஆகுல நீர பிற.",
            });
        }

        return res.status(200).json({
            success: true,
            kural: record.kural,
            updatedAt: record.updatedAt,
        });
    } catch (error) {
        console.error("GET /thirukkural error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch Thirukkural.",
        });
    }
});

router.put("/", async (req, res) => {
    try {
        const { kural } = req.body;

        if (!kural || !kural.trim()) {
            return res.status(400).json({
                success: false,
                message: "Kural text is required.",
            });
        }

        let record = await Thirukkural.findOne();

        if (record) {
            record.kural = kural.trim();
            await record.save();
        } else {
            record = await Thirukkural.create({ kural: kural.trim() });
        }

        return res.status(200).json({
            success: true,
            message: "Thirukkural updated successfully.",
            kural: record.kural,
            updatedAt: record.updatedAt,
        });
    } catch (error) {
        console.error("PUT /thirukkural error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update Thirukkural.",
        });
    }
});

module.exports = router;
