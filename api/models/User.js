import mongoose from "mongoose";
const {Schema, model} = mongoose;

const userSchema = new Schema({
    username: {type: String, required: true, min: 4, unique: true},
    password: {type: String, required: true},
    role: {type: String, enum: ['user', 'admin'], default: 'user' }
});

const UserModel = mongoose.model('User', userSchema);

export default UserModel;