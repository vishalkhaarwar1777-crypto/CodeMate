const express = require("express");

const app = express();

app.use("/user",
(req,res,next)=>{
  console.log("handler1");
  //res.send("responce1");
  next();
},
(req,res,next)=>{
  console.log("hanlder2");
  res.send("response2");
},
);

app.listen(3000, () => {
  console.log("server is successfully listening on port 3000");
});