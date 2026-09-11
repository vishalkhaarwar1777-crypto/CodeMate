const mongoose=require("mongoose");
const validator=require("validator");
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken");

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
userSchema.methods.getJWT=async function(){
  const user=this;
  const token= await jwt.sign({_id:user._id},"dev@Tinder$1777",{ expiresIn: "1d" });
  return token;
};

userSchema.methods.isvalidPassword=async function(passwordInputByYSer){
     const user=this;
     const passwordHash=user.password;

    const isvalidPassword = await bcrypt.compare(passwordInputByYSer,passwordHash);
    return isvalidPassword;
};

module.exports=mongoose.model("user" ,userSchema);