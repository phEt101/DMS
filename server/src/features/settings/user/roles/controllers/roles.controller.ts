import type { RequestHandler } from "express";
import { httpError } from "../../../../../middleware/errors.js";
import * as roles from "../repositories/roles.repository.js";

function roleId(value: string| string[] | undefined): string {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw httpError(400, "Invalid role ID");
  }
  return value;
}

export const index: RequestHandler = async (_req, res) => {
  const data = await roles.findAll();
  res.json({ data });
};

export const show: RequestHandler = async (req, res) => {
  const id = roleId(req.params.id);
  const data = await roles.findById(id);
  if (!data) {
    throw httpError(404, "Role not found");
  }
  res.json({ data });
};
