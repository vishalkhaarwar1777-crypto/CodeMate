const express=require("express");
const authRouter=express.Router();
const{validateSignupData}=require("../utils/validation");
const User = require("../models/user");
const bcrypt=require("bcrypt");


authRouter.post("/signup", async(req,res) =>{
    // Data validation....
    try{
    validateSignupData(req);
    const{firstName,lastName,emailId,password}=req.body;
    //password encryption...
    const hashedPassword=await bcrypt.hash(password,10);
    // creating a new instances of usermodel.........
    const user=new User({
      firstName,
      lastName,
      emailId,
      password:hashedPassword,
    });
      await user.save();
      res.send("user added successfully")
    }catch(err){
      res.status(400).send("Error: " + err.message);
    }
});

authRouter.post("/login", async(req,res)=>{
  try{
    const{emailId,password}=req.body;
    const user=await User.findOne({emailId:emailId});
    if(!user){
      throw new Error("Invalid credentials");
    }
    const isPasswordValid=await user.isvalidPassword(password);
    if(isPasswordValid){
      // create jwt token
      const token= await user.getJWT();

      // add the token to the cookie and seending response back to user.....
       res.cookie("token",token);

      res.send("Login successfully..");
    }else{
      throw new Error("Invalid credentials");
    }
  }catch(err){
    res.status(400).send("ERROR:"+err.message);
  }
});

authRouter.post("/logout", async(req,res) =>{
   res.cookie("token",null,{expires:new Date(Date.now())});
   res.send("logout successfully..");
});

module.exports = authRouter;