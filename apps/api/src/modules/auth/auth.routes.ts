import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

router.get("/status", authController.getStatus);

export const authRoutes = router;
