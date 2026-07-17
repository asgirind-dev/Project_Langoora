const express = require("express");
const router = express.Router();

// Placeholder GET route for system settings
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "System settings route is working!",
  });
});

module.exports = router;
