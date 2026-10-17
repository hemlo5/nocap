import { z } from "zod";
import {
  employmentTypes,
  jobFields,
  mapEntityTypes,
  startupRoleTypes,
  workModes,
} from "@/lib/types";

export const nearbyJobsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(150).default(10),
  source_discovery: z.enum(["off", "validated"]).optional().default("off"),
  source_provider: z.enum(["all", "yc"]).optional().default("all"),
  employment_type: z
    .union([z.enum(["all"]), z.enum(employmentTypes)])
    .optional()
    .default("all"),
  field: z.union([z.enum(["all"]), z.enum(jobFields)]).optional().default("all"),
  work_mode: z
    .union([z.enum(["any"]), z.enum(workModes)])
    .optional()
    .default("any"),
  salary_min: z.coerce.number().int().positive().optional(),
  freshness: z
    .enum(["any", "24h", "3d", "7d", "30d"])
    .optional()
    .default("any"),
  query: z.string().trim().max(120).optional().default(""),
  startup_only: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  student_relevant: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  startup_role_type: z
    .union([z.enum(["all"]), z.enum(startupRoleTypes)])
    .optional()
    .default("all"),
  show_remote_on_map: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
});

const mapEntityLayerSchema = z
  .string()
  .trim()
  .optional()
  .default(mapEntityTypes.join(","))
  .transform((value) =>
    value
      .split(",")
      .map((layer) => layer.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.enum(mapEntityTypes)).min(1));

export const mapEntitiesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(50).default(10),
  layers: mapEntityLayerSchema,
  limit: z.coerce.number().int().min(1).max(300).default(180),
});

export function zodErrorResponse(error: z.ZodError) {
  return Response.json(
    {
      error: "Invalid request",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
    { status: 400 },
  );
}

export function requireBearerSecret(request: Request, envName: string): Response | null {
  const secret = process.env[envName]?.trim();
  if (!secret) {
    return Response.json(
      { error: `${envName} is not configured on the server.` },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
