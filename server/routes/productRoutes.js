import { Router } from "express";
import multer from "multer";
import {
  createProduct,
  getAdminProduct,
  listAdminProducts,
  updateProduct,
  updateProductImage,
  updateProductStatus
} from "../controllers/productController.js";
import { deleteProduct } from "../controllers/productDeleteController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";
import { catalogImageUpload, handleCatalogImageError } from "../services/catalogImageService.js";

import { getAdminMedia,addProductMedia,reorderProductMedia,deleteProductMedia,changeFeatured,setMediaCover,assignMediaVariant,assignMediaScope,setMediaCardCover } from "../controllers/productMediaController.js";
import { listVariants, createVariant, updateVariant } from "../controllers/variantController.js";
const router = Router();

router.use(requireAdmin);
router.get("/:id/variants",listVariants);
router.post("/:id/variants",createVariant);
router.put("/:id/variants/:variantId",updateVariant);
router.get("/", listAdminProducts);
router.delete("/:id", deleteProduct);
router.get("/:id", getAdminProduct);
router.post("/", catalogImageUpload.single("image"), createProduct);
router.put("/:id", updateProduct);
router.patch("/:id/status", updateProductStatus);
router.put("/:id/image", catalogImageUpload.single("image"), updateProductImage);
const productVideoUpload = multer({
 storage:multer.memoryStorage(),
 limits:{fileSize:25*1024*1024,files:1,fields:0},
 fileFilter:(_req,file,cb)=>cb(null,["video/mp4","video/webm"].includes(file.mimetype))
});
router.get("/:id/media",getAdminMedia);
router.post("/:id/media/video",productVideoUpload.single("video"), (req,res,next)=>{
 if(!req.file) return res.status(400).json({message:"Choose an MP4 or WebM video (max 25 MB)"});
 next();
},addProductMedia);
router.put("/:id/media/:mediaId/cover",setMediaCover);
router.put("/:id/media/:mediaId/card-cover",setMediaCardCover);
router.patch("/:id/media/:mediaId/variant",assignMediaVariant);
router.patch("/:id/media/:mediaId/assignment",assignMediaScope);
router.post("/:id/media",catalogImageUpload.single("image"),addProductMedia);
router.put("/:id/media/order",reorderProductMedia);
router.delete("/:id/media/:mediaId",deleteProductMedia);
router.patch("/:id/featured",changeFeatured);
router.use(handleCatalogImageError);
router.use((error,_req,res,next)=>{
 if(error instanceof multer.MulterError) return res.status(400).json({message:error.code==="LIMIT_FILE_SIZE"?"Video must be 25 MB or smaller":"Invalid video upload"});
 next(error);
});

export default router;
