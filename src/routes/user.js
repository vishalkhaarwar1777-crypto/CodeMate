const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const User= require("../models/user");

const USER_SAFE_DATA = "firstName lastName gender about skill profilePhoto";

const ConnectionRequest = require("../models/connectionRequest");

userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId",USER_SAFE_DATA);

    res.json({
      message: "Received connection requests",
      data: connectionRequests,
    });

  } catch (err) {
    res.status(400).send("ERROR: " + err.message);
  }
});

userRouter.get("/user/connection",userAuth,async(req,res)=>{
  try{
  const loggedInUser=req.user;
  const connectionRequest= await ConnectionRequest.find({
    $or:[
      {toUserId:loggedInUser._id, status:"accepted"},
      {fromUserId:loggedInUser._id, status:"accepted"},
    ],
  }).populate("fromUserId",USER_SAFE_DATA)
  .populate("toUserId",USER_SAFE_DATA);
  const data=connectionRequest.map((row)=>{
    if(row.fromUserId._id.toString()===loggedInUser._id.toString()){
      return row.toUserId;
    }
    return row.fromUserId;
  });
     
  res.json({data});
  }catch(err){
     res.status(400).send("ERROR :"+err.message);
  }
});

userRouter.get("/feed",userAuth,async(req,res)=>{
  try{
    const loggedInUser=req.user;

    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit=limit>50?50:limit;

    const connectionRquests=await ConnectionRequest.find({
      $or:[
        {fromUserId:loggedInUser._id},{toUserId:loggedInUser._id}
      ],
    }).select("fromUserId toUserId");

    const hideUserFromFeed=new Set();
    connectionRquests.forEach((req)=>{
      hideUserFromFeed.add(req.fromUserId.toString());
      hideUserFromFeed.add(req.toUserId.toString());
    });

    const users=await User.find({
      $and:[
         {_id:{$nin:Array.from(hideUserFromFeed)}},
         {_id:{$ne:loggedInUser._Id}},
      ],
    }).select(USER_SAFE_DATA)
       .skip((page - 1) * limit)
      .limit(limit);
      res.send(users);
  }catch(err){
    res.status(400).send("ERROR :"+err.message)
  }
})

module.exports = userRouter;