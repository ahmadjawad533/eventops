import { Router } from "express";
import { usersController } from "./users.controller";

const router = Router();

router.get("/status", usersController.getStatus);

export const usersRoutes = router;
