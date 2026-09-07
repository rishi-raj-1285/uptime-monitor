import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/database.js";

dotenv.config({
    path:'./.env'
});

const startServer = async()=>{
    try{
        await connectDB();

        app.on("error", (error)=>{
            console.log(error);
            throw error;
        });
        app.listen(process.env.PORT||8000,()=>{{
            console.log(`Server is running on port ${process.env.PORT||8000}`);
        }})
    } catch(error){
        console.log("server failed to start",error);
    }
}

startServer();