import { Router } from "express";
import { notificationsController } from "./notifications.controller";

const router = Router();

router.get("/status", notificationsController.getStatus);

export const notificationsRoutes = router;
