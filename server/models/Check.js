import mongoose, { Schema } from 'mongoose';

const checkSchema = new Schema(
    {
        monitorId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Monitor',
            required: true
        },
        requestSentAt:{
            type: Date,
            required: true
        },

        responseReceivedAt:{
            type: Date,
        },

        responseTime:{
            type: Number,
            min: 0
        },
        status:{
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            enum: ['UP', 'DOWN']
        },
        httpStatusCode:{
            type: Number,
            min: 100,
            max: 599
        },
        failureReason:{
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
)

export const Check = mongoose.model('Check', checkSchema)