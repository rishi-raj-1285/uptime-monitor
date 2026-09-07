import mongoose, { Schema } from 'mongoose';

const incidentSchema = new Schema(
    {
        monitorId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Monitor',
            required: true
        },
        incidentStartedAt:{
            type: Date,
            required: true
        },
        recoveredAt:{
            type: Date
        },
        duration:{
            type: Number,
            min: 0
        },
        status:{
            type: String,
            required: true,
            uppercase: true,
            enum: ['OPEN', 'RECOVERED']
        }
    },
    {
        timestamps: true
    }
)

export const Incident = mongoose.model('Incident', incidentSchema)