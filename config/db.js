import mongoose from "mongoose";
import colors from "colors";

const connectDB = async () => {
    try {
        // Tay Kai Jun, A0283343E - Added connection pool options for better performance under load
        const conn = await mongoose.connect(process.env.MONGO_URL, {
            maxPoolSize: 100,      // Increase connection pool for concurrent requests
            minPoolSize: 10,       // Keep minimum connections ready
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`Connected To Mongodb Database ${conn.connection.host} / ${conn.connection.name}`.bgMagenta.white);
    } catch (error) {
        console.log(`Error in Mongodb ${error}`.bgRed.white);
    }
};

export default connectDB;