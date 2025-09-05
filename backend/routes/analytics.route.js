import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { getAnalyticsData,getChartData } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/", protectRoute, adminRoute, async (req, res) => {
  try {
    //get the adata from the database
    const analyticsData = await getAnalyticsData();
    //data for the charts
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const chartData= await getChartData(startDate, endDate);

    res.status(200).json({
        analyticsData,
        chartData
    });

  } catch (error) {
    console.error("Error fetching analytics data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
