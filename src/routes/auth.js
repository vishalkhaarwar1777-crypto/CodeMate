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


authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    const user = await User.findOne({ emailId });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await user.isvalidPassword(password);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Create JWT token
    const token = await user.getJWT();

    // Store token in cookie
    res.cookie("token", token);

    // Send user details to frontend
    res.json({
      message: "Login successful",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        photoUrl: user.photoUrl,
      },
    });
  } catch (err) {
    res.status(400).send("ERROR: " + err.message);
  }
});


authRouter.post("/logout", async(req,res) =>{
   res.cookie("token",null,{expires:new Date(Date.now())});
   res.send("user logout");
});

module.exports = authRouter;