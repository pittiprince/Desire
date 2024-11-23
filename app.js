    const express = require('express')
    require('dotenv').config();
    const app = express()
    const mongoose = require('mongoose')
    const PORT = process.env.PORT
    const DB_URI = process.env.MongooseURL
    const userRoutes = require('./routes/user')
    const productsRoutes = require('./routes/Products')

    app.use(express.json());
    app.use('/user',userRoutes)
    app.use('/Products',productsRoutes)

    const establishServer = async() =>{
        try{
        await mongoose.connect(DB_URI)
            app.listen(PORT,()=>{
                console.log(`The server has been started`)
            })
        }catch(err){
            console.log(err)
        }
    }

    establishServer()
