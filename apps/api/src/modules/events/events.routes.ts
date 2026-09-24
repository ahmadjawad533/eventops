import { Router } from "express";
import { eventsController } from "./events.controller";

const router = Router();

router.get("/status", eventsController.getStatus);

export const eventsRoutes = router;
