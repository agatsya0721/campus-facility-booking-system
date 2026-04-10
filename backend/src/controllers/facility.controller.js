import { StatusCodes } from "http-status-codes";
import {
  createFacility,
  deleteFacility,
  getFacility,
  listFacilities,
  updateFacility
} from "../services/facility.service.js";

export const getFacilities = async (_req, res) => {
  const facilities = await listFacilities();
  res.status(StatusCodes.OK).json({ success: true, data: facilities });
};

export const getFacilityById = async (req, res) => {
  const facility = await getFacility(Number(req.params.id));
  res.status(StatusCodes.OK).json({ success: true, data: facility });
};

export const createFacilityHandler = async (req, res) => {
  const facility = await createFacility(req.validated, req.user.id);
  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Facility created successfully.",
    data: facility
  });
};

export const updateFacilityHandler = async (req, res) => {
  const facility = await updateFacility(Number(req.params.id), req.validated);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Facility updated successfully.",
    data: facility
  });
};

export const deleteFacilityHandler = async (req, res) => {
  await deleteFacility(Number(req.params.id));
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Facility deleted successfully."
  });
};
