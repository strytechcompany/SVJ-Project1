const mongoose = require("mongoose");

const thirukkuralSchema = new mongoose.Schema(
    {
        kural: {
            type: String,
            required: true,
            trim: true,
            default: "மனத்துக்கண் மாசிலன் ஆதல் அனைத்தறன் ஆகுல நீர பிற.",
        },
    },
    {
        timestamps: true,
    }
);

const Thirukkural = mongoose.model("Thirukkural", thirukkuralSchema);

module.exports = Thirukkural;
