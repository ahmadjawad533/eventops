import { Router } from "express";
import { sponsorshipController } from "./sponsorship.controller";

const router = Router();

router.get("/status", sponsorshipController.getStatus);

export const sponsorshipRoutes = router;
