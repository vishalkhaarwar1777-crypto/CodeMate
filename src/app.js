const express = require("express");

const app = express();
const{adminAuth}=require("./middleware/auth");
 
app.use("/admin",adminAuth);

app.get("/admin/getAllData",(req,res) => {
    res.send("getAllData");
});
app.get("/admin/deleteAllData",(req,res)=>{
  res.send("deleteAllData");
});

app.listen(3000, () => {
  console.log("server is successfully listening on port 3000");
});