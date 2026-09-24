import { Router } from "express";
import { collaborationController } from "./collaboration.controller";

const router = Router();

router.get("/status", collaborationController.getStatus);

export const collaborationRoutes = router;
