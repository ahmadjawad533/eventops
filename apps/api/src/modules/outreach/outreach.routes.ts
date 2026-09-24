import { Router } from "express";
import { outreachController } from "./outreach.controller";

const router = Router();

router.get("/status", outreachController.getStatus);

export const outreachRoutes = router;
