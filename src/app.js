const express= require("express");

const app=express();
app.use("/Hello",(req,res)=>{
  res.send("hello, hello")
})
app.use("/test",(req,res)=>{
  res.send("Hello from the server!")
});
app.listen(3000,()=>{
  console.log("server is sucessfully listening on port 3000")
});