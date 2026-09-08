const mongoose=require("mongoose");

const userSchema=new mongoose.Schema({
  firstName:{
    type:String,
    required:true,
  },
  lastName:{
    type:String,
  },
  emailId:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
  },
  password:{
    type:String,
    required:true,
  },
  about:{
    type:String,
    default:"Hey ! I am here to using devTinder"
  },
  profilePhoto:{
    type:String,
    default: "default-profile.png"
  },
  skill:{
    type:[String],
    default:[],
  },
},
{
  timestamps:true,
});

module.exports=mongoose.model("user" ,userSchema);