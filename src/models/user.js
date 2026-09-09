const mongoose=require("mongoose");
const validator=require("validator");

const userSchema=new mongoose.Schema({
  firstName:{
    type:String,
    required:true,
    minlength:4,
    maxlength:50
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
    validate(value){
      if(!validator.isEmail(value)){
         throw new error("Invalid email addrees"+value);
      }
    }
  },
  age:{
       type:Number,
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
    default: "default-profile.png",
      validate(value){
      if(!validator.isURL(value)){
         throw new error("Invalid photo URL"+value);
      }
  }
},
  skill:{
    type:[String],
    default:[],
  },
},

{
  timestamps:true,
}
);

module.exports=mongoose.model("user" ,userSchema);