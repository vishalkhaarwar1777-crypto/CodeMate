
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const connectDB=require("./config/database");
const app=express();
const { runInNewContext } = require("vm");
const User = require("./models/user");
const{validateSignupData}=require("./utils/validation");
const bcrypt=require("bcrypt");
const cookieParser =require("cookie-parser");
const jwt=require("jsonwebtoken");
const { userAuth } = require("./middleware/auth");

//middleware..
app.use(express.json());
app.use(cookieParser());
app.post("/signup", async(req,res) =>{
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

app.post("/login", async(req,res)=>{
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

app.get("/profile",userAuth,async(req,res)=>{
 try{ 
  const user=req.user;
  res.send(user);
  }catch(err){
    res.status(400).send("ERROR:"+err.message);
  }
});

app.post("/sendConnectionRequest", async (req,res)=>{
     res.send("connection request send")
})
// get user by eamil
app.get("/user", async(req,res)=>{
const userEmail = req.body.emailId;
  try{
    const users=await User.find({emailId:userEmail});
    if(users.length===0){
      res.status(404).send("user not found");
    }else{
      res.send(users);
    }
  }catch(err){
    res.status(400).send("something went wrong");
  }
});
// feed api:get all user.......
app.get("/feed", async(req,res)=>{
  try{
    const users= await User.find({});
    res.send(users);
  }catch(err){
    res.status(400).send("something went wrong");
  }
});

app.delete("/user", async(req,res)=>{
  const userId = req.body.userId;
  try{
    const user = await User.findByIdAndDelete(userId);
    res.send("user deleted successfully");
  }catch(err){
    res.status(400).send("something went wrong");
  }
});

app.patch("/user/:userId",async(req,res)=>{
const { userId } = req.params;
const data = req.body;
  try{
    const allowedUpdate=["profilePhoto","gender","age","skill"];

    const isUpdateAllowed = Object.keys(data).every((k)=>{
      allowedUpdate.includes(k);
    });
    if(!isUpdateAllowed){
      throw new error("update is not allowd");
    }
    if(data?.skill.length>10){
      throw new error("skill cannot more than 10")
    }
    await User.findByIdAndUpdate(userId,data);
    res.send("user are updated")
  }catch(err){
    res.status(400).send("something went wrong")
  
  }
})

connectDB()
.then( ()=>{
  console.log("database connection is etablished...");
  
 app.listen(3000, () => {
  console.log("server is successfully listening on port 3000");
 });

})
.catch( (err)=> {
  console.error("database cannot be connected..");
  console.log(err);
});
