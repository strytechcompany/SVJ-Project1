const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// DELETE ALL COLLECTIONS
router.delete("/", async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();

    for (let collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
    }

    return res.status(200).json({ message: "All collections deleted successfully!" });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Failed to delete collections" });
  }
});

module.exports = router;
