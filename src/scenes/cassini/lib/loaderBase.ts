import * as THREE from "three";
import { assetUrl } from "@/lib/assetUrl";

// Asset paths are written from the site root.
THREE.DefaultLoadingManager.setURLModifier(assetUrl);
