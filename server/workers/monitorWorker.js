import dotenv from "dotenv";
import connectDB from "../config/database.js";
import {Monitor} from "../models/Monitor.js";
import {Check} from "../models/Check.js";

dotenv.config({
    path:'./.env'
});

const startMonitorWorker = async()=>{
    try{
        await connectDB();

        console.log("Monitor Worker started successfully");
        setInterval(async () => {
            console.log("Checking monitors...");
            let now = new Date();
            let monitors = await Monitor.find({nextCheckAt:{$lte:now}});
            let monitorCount = monitors.length;
            console.log(`Due monitors: ${monitorCount}`);
            for(const monitor of monitors){
                const url = monitor.url;
                // const url = "https://example.com/"; 
                // const url = "https://this-domain-does-not-exist-12345.com";
                // const url = "https://httpbin.org/delay/10"; // Simulating a slow response for testing
                const requestSentAt = new Date();
                let responseReceivedAt;
                let responseTime;
                let httpStatusCode;
                let failureReason;
                let status = "DOWN";
                try{
                    const response = await fetch(url,{
                        signal: AbortSignal.timeout(10000)
                    });
                    responseReceivedAt = new Date();
                    responseTime = responseReceivedAt - requestSentAt;
                    httpStatusCode = response.status;
                    console.log(`Monitor URL: ${url}`)
                    console.log(`HTTP Status: ${httpStatusCode}`);
                    if(httpStatusCode >= 200 && httpStatusCode < 400){
                        console.log("Monitor is UP");
                        status = "UP";
                    }
                    else{
                        console.log("Monitor is DOWN");
                        failureReason = "HTTP_ERROR";
                    }
                    console.log(`Request Sent At: ${requestSentAt}`);
                    console.log(`Response Received At: ${responseReceivedAt}`);
                    console.log(`Response Time: ${responseTime} ms`);
                } catch(error){
                    console.log(`Error while checking monitor URL: ${url}`);
                    console.log("Check Status: DOWN");
                    if(error.name === "TimeoutError"){
                        console.log(`Failure Reason: TIMEOUT`);
                        failureReason = "TIMEOUT";
                    }
                    else{
                        console.log(`Failure Reason: CONNECTION_ERROR`);
                        failureReason = "CONNECTION_ERROR";
                    }
                }
                try{
                    const check = new Check({
                        monitorId: monitor._id,
                        requestSentAt: requestSentAt,
                        responseReceivedAt: responseReceivedAt,
                        responseTime: responseTime,
                        status: status,
                        httpStatusCode: httpStatusCode,
                        failureReason: failureReason
                    })

                    await check.save();
                    console.log("Check saved successfully");    

                    if(status === "UP"){
                        monitor.consecutiveSuccesses += 1;
                        monitor.consecutiveFailures = 0;
                    }
                    else if(status === "DOWN"){
                        monitor.consecutiveFailures += 1;
                        monitor.consecutiveSuccesses = 0;
                    }

                    if(monitor.consecutiveFailures >= 2){
                        monitor.status = "DOWN";
                    }
                    else if(monitor.consecutiveSuccesses >= 2){
                        monitor.status = "UP";
                    }

                    let currentTime = new Date();
                    if(currentTime - monitor.nextCheckAt <= monitor.interval * 1000){
                        monitor.nextCheckAt = new Date(monitor.nextCheckAt.getTime() + monitor.interval * 1000);
                    }
                    else{
                        monitor.nextCheckAt = new Date(currentTime.getTime() + monitor.interval * 1000);
                    }

                    await monitor.save();

                } catch(error){
                    console.log("Error while saving check:", error);
                }
            }
        }, 5000);
    } catch(error){
        console.log("worker failed to start",error);
    }
}

startMonitorWorker();