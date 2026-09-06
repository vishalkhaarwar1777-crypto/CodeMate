
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const connectDB=require("./config/database");
const app=express();
const user=require("./models/user");

app.post("/signup", async(req,res) =>{
    // creating a new instances of usermodel.........
    const newUser=new user({
      firstName:"Rohit",
      lastName:"sharma",
      emailId:"sharna45@gmail.com",
      password:"sharma@45",
    });

    try{
      await newUser.save();
      res.send("user added successfully")
    }catch(err){
      res.status(400).send("error saving the user" + err.message);
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

