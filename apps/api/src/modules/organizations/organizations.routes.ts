import { Router } from "express";
import { organizationsController } from "./organizations.controller";

const router = Router();

router.get("/status", organizationsController.getStatus);

export const organizationsRoutes = router;
