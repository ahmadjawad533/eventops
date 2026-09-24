import { Router } from "express";
import { communitiesController } from "./communities.controller";

const router = Router();

router.get("/status", communitiesController.getStatus);

export const communitiesRoutes = router;
