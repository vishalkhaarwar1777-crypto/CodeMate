
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const connectDB=require("./config/database");
const cookieParser =require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const app=express();
//middleware..
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const authRouter=require("./routes/auth");
const profileRouter=require("./routes/profile");
const connectionRouter=require("./routes/request");
const userRouter=require("./routes/user");
const messageRouter=require("./routes/message");

app.use("/",authRouter);
app.use("/",profileRouter);
app.use("/",connectionRouter);
app.use("/",messageRouter);
app.use("/",userRouter);

connectDB()
.then( ()=>{
  console.log("database connection is etablished...");
  
 app.listen(process.env.PORT, () => {
  console.log("server is successfully listening");
 });

})
.catch( (err)=> {
  console.error("database cannot be connected..");
  console.log(err);
});
