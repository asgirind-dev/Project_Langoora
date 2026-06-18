const studyPlannerService = require('../services/studyPlannerService');

exports.getDashboardData = async (req, res) => {
  try {
    
    const studentId = req.user.uid; 
    
    const data = await studyPlannerService.getStudentPlannerDashboard(studentId);
    
    
    if (data.isLocked) {
      return res.status(200).json({ success: true, isLocked: true, plans: [], profileGoal: null });
    }

    res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error("Fetch planner error:", error.message);
    res.status(500).json({ success: false, message: "Failed to synchronize study planner matrix.", error: error.message });
  }
};


exports.createNewTask = async (req, res) => {
  try {
    const studentId = req.user.uid;
    
    // Input Validation
    if (!req.body.title || !req.body.scheduled_date) {
      return res.status(400).json({ success: false, message: "Task Title and Scheduled Date are required." });
    }

    const task = await studyPlannerService.createPlan(studentId, req.body);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error("Create task error:", error.message);
    
    
    if (error.message.includes('UNAUTHORIZED_LOCK')) {
      return res.status(403).json({ success: false, isLocked: true, message: error.message });
    }
    
    res.status(500).json({ success: false, message: "Failed to commit planner milestone.", error: error.message });
  }
};


exports.updateTask = async (req, res) => {
  try {
    const studentId = req.user.uid;
    const { planId } = req.params;

    const updated = await studyPlannerService.updatePlan(studentId, planId, req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update task error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update lifecycle profile.", error: error.message });
  }
};


exports.deleteTask = async (req, res) => {
  try {
    const studentId = req.user.uid;
    const { planId } = req.params;

    await studyPlannerService.deletePlan(studentId, planId);
    res.status(200).json({ success: true, message: "Milestone safely purged.", id: planId });
  } catch (error) {
    console.error("Delete task error:", error.message);
    res.status(500).json({ success: false, message: "Failed to drop planner node.", error: error.message });
  }
};