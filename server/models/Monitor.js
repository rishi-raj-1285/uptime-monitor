import mongoose, { Schema } from 'mongoose';

const monitorSchema = new Schema(
    {
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            trim: true
        },

        name:{
            type: String,
            required: true,
            trim: true
        },

        url:{
            type: String,
            required: true,
            trim: true
        },

        interval:{
            type: Number,
            required: true,
            min: 1
        },

        status:{
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            enum: ['UP', 'DOWN']
        },

        nextCheckAt:{
            type: Date,
            required: true
        
        },
        consecutiveFailures:{
            type: Number,
            required: true,
            min: 0
        },
        consecutiveSuccesses:{
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
)

export const Monitor = mongoose.model('Monitor', monitorSchema)