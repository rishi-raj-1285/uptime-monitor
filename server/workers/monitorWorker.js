import dotenv from "dotenv";
import connectDB from "../config/database.js";
import {Monitor} from "../models/Monitor.js";
import {Check} from "../models/Check.js";
import {Incident} from "../models/Incident.js";

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

                    let currentTime = new Date();

                    let previousStatus = monitor.status;

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

                    
                    if(currentTime - monitor.nextCheckAt <= monitor.interval * 1000){
                        monitor.nextCheckAt = new Date(monitor.nextCheckAt.getTime() + monitor.interval * 1000);
                    }
                    else{
                        monitor.nextCheckAt = new Date(currentTime.getTime() + monitor.interval * 1000);
                    }

                    await monitor.save();
                    let incidentStartedAt;
                    if (monitor.consecutiveFailures === 2 && monitor.status === "DOWN" && previousStatus === "UP") {
                        const previousDownCheck = await Check.find({
                            monitorId: monitor._id,
                            status: "DOWN"
                        }).sort({ requestSentAt: -1 }).skip(1).limit(1);
                        incidentStartedAt = previousDownCheck[0].requestSentAt;
                        console.log("Incident started at:", incidentStartedAt);

                        const incident = new Incident({
                            monitorId: monitor._id,
                            incidentStartedAt: incidentStartedAt,
                            status: "OPEN"
                        })

                        await incident.save();
                        console.log("Incident created successfully");
                    }

                    if (monitor.consecutiveSuccesses === 2 && monitor.status === "UP" && previousStatus === "DOWN") {
                        const openIncident = await Incident.findOne({
                            monitorId: monitor._id,
                            status: "OPEN"
                        }).sort({ incidentStartedAt: -1 });

                        if (openIncident) {
                            const previousUPCheck = await Check.find({
                                monitorId: monitor._id,
                                status: "UP"
                            }).sort({ requestSentAt: -1 }).skip(1).limit(1);
                            openIncident.recoveredAt = previousUPCheck[0].requestSentAt;
                            openIncident.duration = (openIncident.recoveredAt - openIncident.incidentStartedAt) / 1000; // Duration in seconds
                            openIncident.status = "RECOVERED";
                            await openIncident.save();
                            console.log("Incident recovered successfully");
                        }
                    }

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