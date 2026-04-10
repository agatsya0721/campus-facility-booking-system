import { StatusCodes } from "http-status-codes";
import {
  getActiveAnnouncement,
  upsertAnnouncement,
  validateAnnouncementPayload
} from "../services/announcement.service.js";

export const getAnnouncement = async (_req, res) => {
  const announcement = await getActiveAnnouncement();
  res.status(StatusCodes.OK).json({
    success: true,
    data: announcement
  });
};

export const updateAnnouncement = async (req, res) => {
  validateAnnouncementPayload(req.body);
  const announcement = await upsertAnnouncement({
    title: req.body.title.trim(),
    message: req.body.message.trim(),
    linkUrl: req.body.linkUrl?.trim() || "",
    isActive: req.body.isActive ?? true,
    userId: req.user.id
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Announcement updated successfully.",
    data: announcement
  });
};
