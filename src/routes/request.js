const express=require("express");
const connectionRouter=express.Router();
const { userAuth } = require("../middleware/auth");
const ConnectionRequest=require("../models/connectionRequest");
const User= require("../models/user")


connectionRouter.post("/request/send/:status/:toUserId",userAuth, async (req,res)=>{
    try{
       const fromUserId=req.user._id;
       const toUserId=req.params.toUserId;
       const status=req.params.status;

       const allowedStatus=["ignored","interested"];
       if(!allowedStatus.includes(status)){
           return res.status(400).json({message:"Invalid status type "})
       };
       // user not exit in db
       const toUser=await User.findById(toUserId)
          if(!toUser){
               return res.status(400).json({
                    message:"User not found.."
               });
          };
       
       // if connection is already exit...
       const existingConnectionRequest=await ConnectionRequest.findOne({
          $or:[
               {fromUserId,toUserId},
               {fromUserId:toUserId, toUserId:fromUserId}
          ],
       });
       if(existingConnectionRequest){
          return res.status(400).json({
               message:"connection already exit...."
          })
       };

       const connectionRequest=new ConnectionRequest({
          fromUserId,
          toUserId,
          status,
       });

       const data= await connectionRequest.save();

      return  res.json({
          message:req.user.firstName+" is " +status+" in "+ toUser.firstName,
          data,
       })

     }catch(err){
         return res.status(400).send("ERROR :" + err.message);
     }
});

connectionRouter.post( "/request/review/:status/:requestId",userAuth,async (req, res) => {

    const loggedInUser = req.user;

    const { status, requestId } = req.params;

    const allowedState = ["accepted", "rejected"];

    // Check whether status is allowed
    if (!allowedState.includes(status)) {
      return res.status(400).json({
        message: "Status not allowed..",
      });
    }

    // Find existing connection request
    const connectionRequest = await ConnectionRequest.findOne({
      _id: requestId,
      toUserId: loggedInUser._id,
      status: "interested",
    });

    if (!connectionRequest) {
      return res.status(400).json({
        message: "connection request not found",
      });
    }

    // Update status
    connectionRequest.status = status;

    const data = await connectionRequest.save();

    res.json({
      message: "connection request : " + status,
      data,
    });
  }
);

module.exports = connectionRouter;