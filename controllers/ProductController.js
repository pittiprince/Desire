const ProductValidation = require('../utils/ProductValidation')
const ProductModel = require('../models/productSchema')

exports.AddProduct = async(req,res) =>{
   try {
    let isProductValidation =   ProductValidation(req.body,'AddProduct')
    if(isProductValidation){
        await ProductModel.create({
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            stock: req.body.stock,
            category: req.body.category,
            tags: req.body.tags,
            images: req.body.images,
            brand: req.body.brand,
            rating: req.body.rating
        })
        res.status(200).send(`${req.body.name} product has been successfully added`)
    }else{
        res.status(400).send(isProductValidation)
    }
   } catch (error) {
    console.error(error);
        res.status(500).send('Internal Server Error');
   }
} 

exports.UpdateProduct = async(req,res)=>{
    try {
        let isProductValidation =   await ProductValidation(req.body)
        if (!isProductValidation.success) {
            return res.status(400).json({ error: isProductValidation });
        }
        if(isProductValidation){
           const objectid = req.headers.objectid
           if (!objectid) {
            return res.status(400).json({ error: "Object ID is required in headers" });
        }
           let isProduct = await ProductModel.findById(objectid)
           if (!isProduct) {
            return res.status(404).json({ error: "Product not found" });
        }
        await ProductModel.updateOne(
            { _id: objectid }, // Match by object ID
            { $set: req.body } // Update fields dynamically from the request body
        );
        return res.status(200).json({ message: "Product updated successfully" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}


exports.DeleteProduct = async(req,res)=>{
    try {
        const objectid = req.headers.objectid
        if(!objectid){
            return res.status(400).json(`error: Provide Object Id` );
        }
        let isProduct = await ProductModel.findById(objectid)
        if(isProduct){
            await ProductModel.deleteOne({_id:objectid})
            return res.status(200).json({ message: "Product deleted successfully" });
        }else{
            return res.status(400).json(`error: Product not found` );
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}