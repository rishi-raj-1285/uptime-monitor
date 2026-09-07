import mongoose, { Schema } from 'mongoose';
const userSchema = new Schema(
    {
        name:{
            type: String,
            required: true,
            trim: true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },
        password:{
            type: String,
            required: true,
            match: [
                        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/,
                        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
                    ]
        }
    },
    {
        timestamps: true
    }
)

export const User = mongoose.model('User', userSchema)