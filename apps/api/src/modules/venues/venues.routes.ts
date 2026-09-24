import { Router } from "express";
import { venuesController } from "./venues.controller";

const router = Router();

router.get("/status", venuesController.getStatus);

export const venuesRoutes = router;
