
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const connectDB=require("./config/database");
const app=express();
const { runInNewContext } = require("vm");
const User = require("./models/user");

app.use(express.json());

app.post("/signup", async(req,res) =>{
    // creating a new instances of usermodel.........
    const user=new User(req.body);
    try{
      await user.save();
      res.send("user added successfully")
    }catch(err){
      res.status(400).send("error saving the user" + err.message);
    }
});
// get user by eamil
app.get("/user", async(req,res)=>{
  const userEmail= req.body.emailId;
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
// feed app:get all user.......
app.get("/feed", async(req,res)=>{
  try{
    const users= await User.find({});
    res.send(users);
  }catch(err){
    res.status(400).send("something went wrong");
  }
});

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

