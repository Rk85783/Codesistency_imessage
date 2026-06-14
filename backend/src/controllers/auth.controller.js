import User from "../models/user.model.js";

export async function checkAuth(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    res.status(200).json(req.user);
}

export async function updateProfile(req, res) {
  try {
    const { fullName } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: "Full name is required" });
    }

    if (fullName.trim().length > 50) {
      return res.status(400).json({ message: "Full name must be at most 50 characters" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { fullName: fullName.trim() },
      { new: true },
    ).select("-clerkId");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
